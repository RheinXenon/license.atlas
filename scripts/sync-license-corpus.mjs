// Sync the core LicenseAtlas license corpus from the sibling KB checkout.
// This covers the main license full texts and cleaned metadata, distinct from
// sidecars such as tracker, OSADL, and project showcase data.
// Run: node scripts/sync-license-corpus.mjs [--kb-path <path>]
// New license slugs are blocked by default. After the KB-side dedupe / cleanup /
// confirmation workflow is complete, pass --allow-new-licenses to sync them.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const allowNewLicenses = process.argv.includes("--allow-new-licenses");

function resolveKbPath() {
  const flagIdx = process.argv.indexOf("--kb-path");
  if (flagIdx !== -1) {
    const kbPathArg = process.argv[flagIdx + 1];
    if (!kbPathArg || kbPathArg.startsWith("-")) {
      console.error("✗ Missing value for --kb-path");
      process.exit(1);
    }
    return resolve(kbPathArg);
  }
  if (process.env.KB_PATH) return resolve(process.env.KB_PATH);
  return resolve(ROOT, "..", "KB");
}

function sha1File(...files) {
  const h = createHash("sha1");
  for (const file of files) h.update(readFileSync(file));
  return h.digest("hex").slice(0, 16);
}

const KB_ROOT = resolveKbPath();
const KB_DIR = resolve(KB_ROOT, "data", "licenses", "cleaned");
const KB_LICENSES = resolve(KB_DIR, "licenses.json");
const KB_INDEX = resolve(KB_DIR, "licenses-index.json");
const KB_STATS = resolve(KB_DIR, "stats.json");

const ATLAS_LICENSES = resolve(ROOT, "src", "data", "licenses.json");
const ATLAS_INDEX = resolve(ROOT, "src", "data", "licenses-index.json");
const ATLAS_STATS = resolve(ROOT, "src", "data", "stats.json");

const required = [KB_LICENSES, KB_INDEX, KB_STATS];
if (!required.every(existsSync)) {
  if ([ATLAS_LICENSES, ATLAS_INDEX, ATLAS_STATS].every(existsSync)) {
    console.log(`✓ KB cleaned license corpus not found at ${KB_DIR}`);
    console.log("  Using committed Atlas license corpus.");
    process.exit(0);
  }
  console.error(`✗ KB cleaned license corpus missing under ${KB_DIR}`);
  process.exit(1);
}

const sourceHash = sha1File(KB_LICENSES, KB_INDEX, KB_STATS);
const existingHash = [ATLAS_LICENSES, ATLAS_INDEX, ATLAS_STATS].every(existsSync)
  ? sha1File(ATLAS_LICENSES, ATLAS_INDEX, ATLAS_STATS)
  : "";

if (sourceHash === existingHash) {
  console.log(`✓ License corpus unchanged (hash ${sourceHash}), skip sync`);
  process.exit(0);
}

if (!allowNewLicenses && existsSync(ATLAS_INDEX)) {
  const sourceIndex = JSON.parse(readFileSync(KB_INDEX, "utf8"));
  const atlasIndex = JSON.parse(readFileSync(ATLAS_INDEX, "utf8"));
  const atlasSlugs = new Set(atlasIndex.map((license) => license.slug));
  const newLicenses = sourceIndex.filter((license) => !atlasSlugs.has(license.slug));

  if (newLicenses.length > 0) {
    console.error(`✗ Refusing to sync ${newLicenses.length} new license slug(s) before review.`);
    console.error("  Run the KB dedupe / cleanup / confirmation workflow first, then rerun with --allow-new-licenses.");
    console.error("  New candidates:");
    for (const license of newLicenses) {
      const sources = (license.sources || []).map((source) => `${source.name}: ${source.url}`).join(" | ");
      console.error(`  - ${license.slug} :: ${license.title}${sources ? ` (${sources})` : ""}`);
    }
    process.exit(2);
  }
}

mkdirSync(dirname(ATLAS_LICENSES), { recursive: true });
copyFileSync(KB_LICENSES, ATLAS_LICENSES);
copyFileSync(KB_INDEX, ATLAS_INDEX);
copyFileSync(KB_STATS, ATLAS_STATS);

const licenses = JSON.parse(readFileSync(ATLAS_LICENSES, "utf8"));
const stats = JSON.parse(readFileSync(ATLAS_STATS, "utf8"));
writeFileSync(
  resolve(ROOT, "src", "data", "license-corpus-meta.json"),
  JSON.stringify({
    source_hash: sourceHash,
    generated_at: stats.updated || new Date().toISOString().slice(0, 10),
    total: Array.isArray(licenses) ? licenses.length : stats.total,
  }, null, 2),
);

console.log(`✓ Synced ${Array.isArray(licenses) ? licenses.length : stats.total} licenses -> src/data/licenses*.json + stats.json`);
console.log(`  source_hash: ${sourceHash}`);
