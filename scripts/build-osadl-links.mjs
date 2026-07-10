/**
 * build-osadl-links.mjs
 *
 * Reads the OSADL clause-linking experiment results and produces:
 *   1. src/data/generated-osadl-links-v1.json — combined link index keyed by slug
 *   2. Updates the 26 manually-repaired slug trees in:
 *        src/data/generated-osadl-checklists-v34-index.json
 *        public/data/generated-osadl-checklists-v34.json
 *
 * Run: node scripts/build-osadl-links.mjs [--dry-run] [--links-only] [--slug <slug>]
 * Check: node scripts/build-osadl-links.mjs --ensure
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXPERIMENT_ROOT = resolve(ROOT, "..", "OSADL条款出处对应实验");

const RESULTS_GENERATED = resolve(EXPERIMENT_ROOT, "results", "predictions_link_v1_generated_full");
const RESULTS_OFFICIAL = resolve(EXPERIMENT_ROOT, "results", "predictions_link_v1_official_full");
const REPAIRS_FILE = resolve(EXPERIMENT_ROOT, "data", "processed", "manual_repairs_26.json");

const LINKS_OUTPUT = resolve(ROOT, "src", "data", "generated-osadl-links-v1.json");
const GENERATED_INDEX = resolve(ROOT, "src", "data", "generated-osadl-checklists-v34-index.json");
const GENERATED_PUBLIC = resolve(ROOT, "public", "data", "generated-osadl-checklists-v34.json");

const DRY_RUN = process.argv.includes("--dry-run");
const LINKS_ONLY = process.argv.includes("--links-only");
const ENSURE_ONLY = process.argv.includes("--ensure");
const SLUG_FILTER = (() => {
  const idx = process.argv.indexOf("--slug");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

// ── Inline parseChecklist (mirrors src/lib/osadl-parser.ts) ─────────────────

function parseActions(actionsObj, isProhibition = false) {
  const actions = [];
  if (typeof actionsObj === "string") {
    actions.push({ text: actionsObj, type: isProhibition ? "must-not" : "must" });
    return actions;
  }
  if (typeof actionsObj !== "object" || actionsObj === null) return actions;
  for (const [actionText, actionValue] of Object.entries(actionsObj)) {
    if (actionText === "ATTRIBUTE") continue;
    const action = { text: actionText, type: isProhibition ? "must-not" : "must", attributes: [] };
    if (typeof actionValue === "object" && actionValue !== null && actionValue.ATTRIBUTE) {
      action.attributes = parseActionAttributes(actionValue.ATTRIBUTE);
    }
    if (action.attributes.length === 0) delete action.attributes;
    actions.push(action);
  }
  return actions;
}

function parseActionAttributes(attrValue) {
  if (typeof attrValue === "string") return [attrValue];
  if (Array.isArray(attrValue)) return attrValue.filter((v) => typeof v === "string");
  if (typeof attrValue === "object" && attrValue !== null) return Object.keys(attrValue);
  return [];
}

function parseConditionMap(map) {
  return Object.entries(map)
    .filter(([, v]) => typeof v === "object" && v !== null)
    .map(([conditionName, subtree]) => {
      const block = parseUseCaseSubtree(subtree);
      block.condition = conditionName;
      return block;
    });
}

function parseEither(eitherObj) {
  const group = { options: [], common: [] };
  for (const [, value] of Object.entries(eitherObj)) {
    if (typeof value !== "object" || value === null) continue;
    if (value.OR) {
      const options = parseOrBranch(value.OR);
      group.options.push(...options);
    }
    if (value["YOU MUST"]) group.common.push(...parseActions(value["YOU MUST"]));
    if (value["YOU MUST NOT"]) group.common.push(...parseActions(value["YOU MUST NOT"], true));
  }
  if (group.common.length === 0) delete group.common;
  return group;
}

function parseOrBranch(orObj) {
  const options = [];
  for (const [, value] of Object.entries(orObj)) {
    if (typeof value !== "object" || value === null) continue;
    const optionActions = parseUseCaseSubtree(value);
    const allActions = [...(optionActions.then || [])];
    if (optionActions.either) {
      for (const eg of optionActions.either) {
        for (const opt of eg.options) allActions.push(...opt);
      }
    }
    if (allActions.length > 0) options.push(allActions);
  }
  return options;
}

function parseEitherIf(eitherIfObj) {
  const blocks = [];
  for (const [, value] of Object.entries(eitherIfObj)) {
    if (typeof value !== "object" || value === null) continue;
    for (const [conditionName, subtree] of Object.entries(value)) {
      if (typeof subtree !== "object" || subtree === null) continue;
      const block = parseUseCaseSubtree(subtree);
      block.condition = conditionName;
      blocks.push(block);
    }
  }
  return blocks;
}

function parseUseCaseSubtree(subtree) {
  const then = [], either = [], children = [], except = [];
  for (const [key, value] of Object.entries(subtree)) {
    if (key === "YOU MUST") then.push(...parseActions(value));
    else if (key === "YOU MUST NOT") then.push(...parseActions(value, true));
    else if (key === "IF") children.push(...parseConditionMap(value));
    else if (key === "EXCEPT IF") except.push(...parseConditionMap(value));
    else if (key === "EITHER") either.push(parseEither(value));
    else if (key === "EITHER IF") children.push(...parseEitherIf(value));
  }
  return {
    condition: "root",
    ...(then.length > 0 ? { then } : {}),
    ...(either.length > 0 ? { either } : {}),
    ...(children.length > 0 ? { children } : {}),
    ...(except.length > 0 ? { except } : {}),
  };
}

function parseChecklist(checklist) {
  const trees = [];
  const useCaseObj = checklist["USE CASE"];
  if (!useCaseObj || typeof useCaseObj !== "object") return trees;
  for (const [useCaseName, useCaseSubtree] of Object.entries(useCaseObj)) {
    if (typeof useCaseSubtree !== "object" || useCaseSubtree === null) continue;
    const root = parseUseCaseSubtree(useCaseSubtree);
    root.condition = "root";
    trees.push({ use_case: useCaseName, root });
  }
  return trees;
}

// ── Build link data from a result file ──────────────────────────────────────

function buildLinkFile(result) {
  const { slug, source_kind, links = [], clauses: topClauses = [], status } = result;
  if (status !== "ok") return null;

  // Build node_links: node_key → [{clauseId, startChar, endChar, support}]
  const nodeLinks = {};
  const clauseSpanMap = new Map(); // id → {startChar, endChar}

  for (const link of links) {
    const { node_key, support, clauses: linkClauses = [] } = link;
    if (!node_key || !Array.isArray(linkClauses)) continue;
    const spans = [];
    for (const c of linkClauses) {
      if (typeof c.id !== "string" || typeof c.start_char !== "number") continue;
      spans.push({ clauseId: c.id, startChar: c.start_char, endChar: c.end_char, support: support || "direct" });
      if (!clauseSpanMap.has(c.id)) {
        clauseSpanMap.set(c.id, { id: c.id, startChar: c.start_char, endChar: c.end_char });
      }
    }
    if (spans.length > 0) {
      if (!nodeLinks[node_key]) nodeLinks[node_key] = [];
      nodeLinks[node_key].push(...spans);
    }
  }

  // Supplement clause_spans from top-level clauses (include spans for unlinked clauses too)
  for (const c of topClauses) {
    if (typeof c.id === "string" && !clauseSpanMap.has(c.id)) {
      // Top-level clauses list only has {id, text}, no startChar from some runs.
      // Only add if we can infer from result — skip if no span info.
      // (spans come from links[].clauses which have start_char/end_char)
    }
  }

  const clauseSpans = [...clauseSpanMap.values()].sort((a, b) => a.startChar - b.startChar);

  if (Object.keys(nodeLinks).length === 0 && clauseSpans.length === 0) return null;

  return {
    slug,
    source_kind: source_kind || "generated",
    node_links: nodeLinks,
    clause_spans: clauseSpans,
  };
}

// ── Read one result dir ──────────────────────────────────────────────────────

function readResultDir(dir, sourceKind) {
  if (!existsSync(dir)) return new Map();
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const map = new Map();
  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    if (SLUG_FILTER && slug !== SLUG_FILTER) continue;
    try {
      const raw = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
      map.set(slug, { ...raw, source_kind: sourceKind });
    } catch {
      // skip malformed
    }
  }
  return map;
}

// ── Update index trees for 26 repaired slugs ────────────────────────────────

function applyRepairs(generatedIndex, generatedPublic, repairs) {
  let indexUpdated = 0;
  let publicUpdated = 0;

  const publicBySlug = new Map();
  const publicRecords = generatedPublic.records || (Array.isArray(generatedPublic) ? generatedPublic : []);
  for (const rec of publicRecords) {
    if (rec.slug) publicBySlug.set(rec.slug, rec);
  }

  for (const repair of repairs.repairs || []) {
    const { slug, checklist } = repair;
    if (SLUG_FILTER && slug !== SLUG_FILTER) continue;

    const newTrees = parseChecklist(checklist);

    // Update index (by_slug)
    const indexEntry = generatedIndex.by_slug?.[slug];
    if (indexEntry) {
      const oldUC = (indexEntry.trees || []).map((t) => t.use_case).join(", ");
      const newUC = newTrees.map((t) => t.use_case).join(", ");
      if (oldUC !== newUC) {
        indexEntry.trees = newTrees;
        // Recount
        let use_cases = 0, conditions = 0, obligations = 0, prohibitions = 0;
        function countBlock(block) {
          if (block.then) for (const a of block.then) { if (a.type === "must") obligations++; else prohibitions++; }
          if (block.either) for (const eg of block.either) {
            if (eg.common) for (const a of eg.common) { if (a.type === "must") obligations++; else prohibitions++; }
            for (const opt of eg.options) for (const a of opt) { if (a.type === "must") obligations++; else prohibitions++; }
          }
          if (block.children) { conditions += block.children.length; block.children.forEach(countBlock); }
          if (block.except) block.except.forEach(countBlock);
        }
        for (const tree of newTrees) { use_cases++; countBlock(tree.root); }
        indexEntry.counts = { use_cases, conditions, obligations, prohibitions };
        console.log(`  ✓ index [${slug}]: "${oldUC}" → "${newUC}"`);
        indexUpdated++;
      }
    }

    // Update public (records[].checklist + trees)
    const pubEntry = publicBySlug.get(slug);
    if (pubEntry) {
      pubEntry.checklist = checklist;
      pubEntry.trees = newTrees;
      publicUpdated++;
    }
  }

  return { indexUpdated, publicUpdated };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== build-osadl-links ===");
  if (ENSURE_ONLY) {
    if (!existsSync(LINKS_OUTPUT)) {
      throw new Error(`Missing generated OSADL link index: ${LINKS_OUTPUT}`);
    }
    const index = JSON.parse(readFileSync(LINKS_OUTPUT, "utf8"));
    const count = Object.keys(index.by_slug || {}).length;
    if (!index._meta || count === 0 || index._meta.record_count !== count) {
      throw new Error(`Invalid generated OSADL link index: ${LINKS_OUTPUT}`);
    }
    console.log(`  verified: ${count} records`);
    return;
  }

  console.log(`DRY_RUN: ${DRY_RUN}, LINKS_ONLY: ${LINKS_ONLY}, SLUG_FILTER: ${SLUG_FILTER || "(all)"}`);

  // 1. Read experiment results
  console.log("\n[1] Reading experiment results…");
  const generated = readResultDir(RESULTS_GENERATED, "generated");
  const official = readResultDir(RESULTS_OFFICIAL, "official");
  console.log(`  generated: ${generated.size}, official: ${official.size}`);
  if (generated.size === 0 && official.size === 0) {
    throw new Error(`No experiment results found under ${EXPERIMENT_ROOT}`);
  }

  // Official takes precedence per slug (matches resolveOsadlChecklist logic)
  const allResults = new Map([...generated, ...official]);
  // official can override generated for same slug
  for (const [slug, rec] of official) allResults.set(slug, rec);

  // 2. Build link files
  console.log("\n[2] Building combined link index…");

  let bySlug = {};
  if (SLUG_FILTER && existsSync(LINKS_OUTPUT)) {
    const existing = JSON.parse(readFileSync(LINKS_OUTPUT, "utf8"));
    bySlug = { ...(existing.by_slug || {}) };
  }

  let written = 0, skipped = 0;
  for (const [slug, result] of allResults) {
    const linkFile = buildLinkFile(result);
    if (!linkFile) { skipped++; continue; }
    bySlug[slug] = linkFile;
    written++;
  }
  console.log(`  written: ${written}, skipped (no links): ${skipped}`);

  const records = Object.values(bySlug);
  const linkIndex = {
    _meta: {
      generated_at: new Date().toISOString(),
      record_count: records.length,
      generated_count: records.filter((record) => record.source_kind === "generated").length,
      official_count: records.filter((record) => record.source_kind === "official").length,
    },
    by_slug: bySlug,
  };
  if (!DRY_RUN) {
    writeFileSync(LINKS_OUTPUT, JSON.stringify(linkIndex) + "\n", "utf8");
    console.log(`  index written: ${LINKS_OUTPUT}`);
  }

  // 3. Apply 26 repairs to index + public data
  console.log("\n[3] Applying 26 manual repairs to index/public…");
  if (LINKS_ONLY) {
    console.log("  (links-only, skipping repairs)");
  } else if (!existsSync(REPAIRS_FILE)) {
    console.log("  (repairs file not found, skipping)");
  } else {
    const repairs = JSON.parse(readFileSync(REPAIRS_FILE, "utf8"));
    const generatedIndex = JSON.parse(readFileSync(GENERATED_INDEX, "utf8"));
    const generatedPublic = JSON.parse(readFileSync(GENERATED_PUBLIC, "utf8"));

    const { indexUpdated, publicUpdated } = applyRepairs(generatedIndex, generatedPublic, repairs);

    if (!DRY_RUN && indexUpdated > 0) {
      writeFileSync(GENERATED_INDEX, JSON.stringify(generatedIndex, null, 2) + "\n", "utf8");
      console.log(`  index updated: ${indexUpdated} slugs → src/data/generated-osadl-checklists-v34-index.json`);
    }
    if (!DRY_RUN && publicUpdated > 0) {
      writeFileSync(GENERATED_PUBLIC, JSON.stringify(generatedPublic, null, 2) + "\n", "utf8");
      console.log(`  public updated: ${publicUpdated} slugs → public/data/generated-osadl-checklists-v34.json`);
    }
    if (DRY_RUN) {
      console.log(`  [dry-run] would update index: ${indexUpdated}, public: ${publicUpdated}`);
    }
  }

  console.log(`\nDone. ${linkIndex._meta.record_count} records in ${LINKS_OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
