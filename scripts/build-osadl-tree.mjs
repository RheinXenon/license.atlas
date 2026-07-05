// Build OSADL obligation tree index from raw checklist data.
// Reads public/data/osadl-checklists.json and generates
// src/data/osadl-checklists-index.json with structured obligation trees.
//
// Usage: node scripts/build-osadl-tree.mjs

import { readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const ATLAS_FULL = resolve(ROOT, "public", "data", "osadl-checklists.json");
const ATLAS_INDEX = resolve(ROOT, "src", "data", "osadl-checklists-index.json");
const ATLAS_META = resolve(ROOT, "src", "data", "osadl-meta.json");

const INDEX_SCHEMA_VERSION = 3;

function normKey(value) {
  return String(value || "").trim().toLowerCase();
}

function capList(values, max) {
  return Array.isArray(values) ? values.slice(0, max) : [];
}

function uniqueStrings(values) {
  return [...new Set((values || []).filter(Boolean).map(String))];
}

// Parse raw checklist tree structure
function parseChecklistTree(checklist) {
  if (!checklist || !checklist["USE CASE"]) return [];

  const trees = [];
  const useCaseObj = checklist["USE CASE"];

  for (const [useCaseName, useCaseSubtree] of Object.entries(useCaseObj)) {
    if (typeof useCaseSubtree === "object" && useCaseSubtree !== null) {
      const root = parseUseCaseSubtree(useCaseSubtree);
      root.condition = "root";
      trees.push({
        use_case: useCaseName,
        root,
      });
    }
  }

  return trees;
}

function parseUseCaseSubtree(subtree) {
  const condition = {
    condition: "root",
    then: [],
    either: [],
    children: [],
    except: [],
  };

  for (const [key, value] of Object.entries(subtree)) {
    if (key === "YOU MUST") {
      const actions = parseActions(value);
      condition.then.push(...actions);
    } else if (key === "YOU MUST NOT") {
      const actions = parseActions(value, true);
      condition.then.push(...actions);
    } else if (key === "IF") {
      const children = parseConditionMap(value);
      condition.children.push(...children);
    } else if (key === "EXCEPT IF") {
      const exceptBlocks = parseConditionMap(value);
      condition.except.push(...exceptBlocks);
    } else if (key === "EITHER") {
      const eitherGroup = parseEither(value);
      condition.either.push(eitherGroup);
    } else if (key === "EITHER IF") {
      const children = parseEitherIf(value);
      condition.children.push(...children);
    }
  }

  if (condition.then.length === 0) delete condition.then;
  if (condition.either.length === 0) delete condition.either;
  if (condition.children.length === 0) delete condition.children;
  if (condition.except.length === 0) delete condition.except;

  return condition;
}

function parseConditionMap(map) {
  const blocks = [];

  for (const [conditionName, subtree] of Object.entries(map)) {
    if (typeof subtree === "object" && subtree !== null) {
      const block = parseUseCaseSubtree(subtree);
      block.condition = conditionName;
      blocks.push(block);
    }
  }

  return blocks;
}

function parseEither(eitherObj) {
  const group = {
    options: [],
    common: [],
  };

  for (const [key, value] of Object.entries(eitherObj)) {
    if (typeof value === "object" && value !== null) {
      if (value.OR) {
        const options = parseOrBranch(value.OR);
        group.options.push(...options);
      }

      if (value["YOU MUST"]) {
        const commonActions = parseActions(value["YOU MUST"]);
        group.common.push(...commonActions);
      }
      if (value["YOU MUST NOT"]) {
        const commonActions = parseActions(value["YOU MUST NOT"], true);
        group.common.push(...commonActions);
      }
    }
  }

  if (group.common.length === 0) delete group.common;

  return group;
}

function parseOrBranch(orObj) {
  const options = [];

  for (const [key, value] of Object.entries(orObj)) {
    if (typeof value === "object" && value !== null) {
      const optionActions = parseUseCaseSubtree(value);
      const allActions = [...(optionActions.then || [])];

      if (optionActions.either && optionActions.either.length > 0) {
        for (const eg of optionActions.either) {
          for (const opt of eg.options) {
            allActions.push(...opt);
          }
        }
      }

      if (allActions.length > 0) {
        options.push(allActions);
      }
    }
  }

  return options;
}

function parseEitherIf(eitherIfObj) {
  const blocks = [];

  for (const [key, value] of Object.entries(eitherIfObj)) {
    if (typeof value === "object" && value !== null) {
      for (const [conditionName, subtree] of Object.entries(value)) {
        if (typeof subtree === "object" && subtree !== null) {
          const block = parseUseCaseSubtree(subtree);
          block.condition = conditionName;
          blocks.push(block);
        }
      }
    }
  }

  return blocks;
}

function parseActions(actionsObj, isProhibition = false) {
  const actions = [];

  if (typeof actionsObj === "string") {
    actions.push({ text: actionsObj, type: isProhibition ? 'must-not' : 'must' });
    return actions;
  }

  if (typeof actionsObj !== "object" || actionsObj === null) {
    return actions;
  }

  for (const [actionText, actionValue] of Object.entries(actionsObj)) {
    if (actionText === "ATTRIBUTE") continue;

    const action = {
      text: actionText,
      type: isProhibition ? 'must-not' : 'must',
      attributes: [],
    };

    if (typeof actionValue === "object" && actionValue !== null) {
      if (actionValue.ATTRIBUTE) {
        action.attributes = parseActionAttributes(actionValue.ATTRIBUTE);
      }
    }

    if (action.attributes && action.attributes.length === 0) {
      delete action.attributes;
    }

    actions.push(action);
  }

  return actions;
}

function parseActionAttributes(attrValue) {
  const attributes = [];

  if (typeof attrValue === "string") {
    attributes.push(attrValue);
    return attributes;
  }

  if (Array.isArray(attrValue)) {
    return attrValue.filter((v) => typeof v === "string");
  }

  if (typeof attrValue === "object" && attrValue !== null) {
    for (const [attrName] of Object.entries(attrValue)) {
      attributes.push(attrName);
    }
  }

  return attributes;
}

// Count actions in a condition block
function countActions(block) {
  let obligations = 0;
  let prohibitions = 0;
  let conditions = 0;

  if (block.then) {
    for (const action of block.then) {
      if (action.type === 'must-not') {
        prohibitions++;
      } else {
        obligations++;
      }
    }
  }

  if (block.either) {
    for (const eg of block.either) {
      if (eg.common) {
        for (const action of eg.common) {
          if (action.type === 'must-not') {
            prohibitions++;
          } else {
            obligations++;
          }
        }
      }
      for (const option of eg.options) {
        for (const action of option) {
          if (action.type === 'must-not') {
            prohibitions++;
          } else {
            obligations++;
          }
        }
      }
    }
  }

  if (block.children) {
    for (const child of block.children) {
      conditions++;
      const childCounts = countActions(child);
      obligations += childCounts.obligations;
      prohibitions += childCounts.prohibitions;
      conditions += childCounts.conditions;
    }
  }

  if (block.except) {
    for (const except of block.except) {
      const exceptCounts = countActions(except);
      obligations += exceptCounts.obligations;
      prohibitions += exceptCounts.prohibitions;
      conditions += exceptCounts.conditions;
    }
  }

  return { obligations, prohibitions, conditions };
}

function compactRecord(record) {
  const summary = record.summary || {};
  const checklist = record.checklist || {};

  // Parse the tree structure
  const trees = parseChecklistTree(checklist);

  // Count from tree
  let totalObligations = 0;
  let totalProhibitions = 0;
  let totalConditions = 0;

  for (const tree of trees) {
    const counts = countActions(tree.root);
    totalObligations += counts.obligations;
    totalProhibitions += counts.prohibitions;
    totalConditions += counts.conditions;
  }

  return {
    spdx_id: record.spdx_id,
    slug: record.slug,
    source_urls: record.source_urls || {},
    has_raw_txt: !!record.has_raw_txt,
    copyleft: record.copyleft || "Unknown",
    source_disclosure: record.source_disclosure || "Unknown",
    patent_hints: summary.patent_hints || null,
    copyleft_clause: summary.copyleft_clause || null,
    raw_hash: record.raw_hash || "",
    trees,
    compatibility_samples: {
      compatible: capList(summary.compatibility, 16),
      incompatible: capList(summary.incompatibility, 16),
      check_dependency: capList(summary.depending_compatibility, 16),
    },
    counts: {
      use_cases: trees.length,
      conditions: totalConditions,
      obligations: totalObligations,
      prohibitions: totalProhibitions,
    },
    compatibility_summary: record.compatibility_summary || {
      yes: 0,
      no: 0,
      same: 0,
      unknown: 0,
      check_dependency: 0,
    },
  };
}

// Main
console.log("Reading OSADL data from:", ATLAS_FULL);

let full;
try {
  full = JSON.parse(readFileSync(ATLAS_FULL, "utf8"));
} catch (err) {
  console.error("Failed to read OSADL data:", err.message);
  process.exit(1);
}

const records = Array.isArray(full.records) ? full.records : [];
console.log(`Found ${records.length} records`);

const bySpdx = {};
const compactRecords = records.map(compactRecord);

for (const record of compactRecords) {
  if (record.spdx_id) bySpdx[normKey(record.spdx_id)] = record;
}

// Read existing meta for source hash
let existingMeta = {};
try {
  existingMeta = JSON.parse(readFileSync(ATLAS_META, "utf8"));
} catch {
  // Ignore
}

const meta = {
  source_hash: existingMeta.source_hash || "",
  index_schema_version: INDEX_SCHEMA_VERSION,
  generated_at: new Date().toISOString(),
  source: full.meta?.source || "OSADL Open Source License Checklists",
  source_url: full.meta?.source_url || "",
  checklist_project_url: full.meta?.checklist_project_url || "",
  compatibility_notes_url: full.meta?.compatibility_notes_url || "",
  osloc2json_url: full.meta?.osloc2json_url || "",
  raw_data_license: full.meta?.raw_data_license || "",
  attribution: full.meta?.attribution || "",
  copyright: full.meta?.copyright || "",
  disclaimer: full.meta?.disclaimer || "",
  draft_note: full.meta?.draft_note || "",
  timestamp: full.meta?.timestamp || "",
  matrix_timestamp: full.meta?.matrix_timestamp || "",
  record_count: records.length,
  matrix_license_count: full.meta?.matrix_license_count || records.length,
  match_counts: existingMeta.match_counts || {},
};

const index = { _meta: meta, by_spdx: bySpdx };

writeFileSync(ATLAS_INDEX, JSON.stringify(index, null, 2), "utf8");
console.log(`Wrote index to ${ATLAS_INDEX}`);

// Update meta file
writeFileSync(ATLAS_META, JSON.stringify(meta, null, 2), "utf8");
console.log(`Updated meta in ${ATLAS_META}`);

// Stats
const withEither = compactRecords.filter(
  (r) => r.trees.some((t) => JSON.stringify(t).includes('"either"')),
).length;
const withIf = compactRecords.filter(
  (r) => r.trees.some((t) => JSON.stringify(t).includes('"children"')),
).length;

console.log(`\nStats:`);
console.log(`  Total records: ${records.length}`);
console.log(`  With EITHER/OR: ${withEither}`);
console.log(`  With IF conditions: ${withIf}`);
console.log(`  Schema version: ${INDEX_SCHEMA_VERSION}`);
