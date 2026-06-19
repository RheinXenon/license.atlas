// Full-chain orchestrator: rebuild tracker in KB (LLM + build + enrich) then sync to atlas.
// Run: node scripts/update-tracker.mjs [--full] [--kb-path <path>]
//   --full        re-extract ALL URLs via LLM (default: incremental, only new URLs)
//   --kb-path     override KB path (default ../KB)
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const FULL = process.argv.includes("--full");
const flagIdx = process.argv.indexOf("--kb-path");
const KB_ROOT = flagIdx !== -1 && process.argv[flagIdx + 1]
  ? resolve(process.argv[flagIdx + 1])
  : resolve(ROOT, "..", "KB");

if (!existsSync(KB_ROOT)) {
  console.error(`✗ KB not found: ${KB_ROOT}`);
  process.exit(1);
}

function run(cmd, cwd) {
  console.log(`\n▶ ${cmd}  (in ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

console.log(`Orchestrating tracker rebuild in KB: ${KB_ROOT}`);
console.log(`LLM mode: ${FULL ? "FULL (re-extract all)" : "INCREMENTAL (new URLs only)"}`);

// 1. LLM extraction (opinion/sentiment). apply-llm-batches is incremental by default.
run("node scripts/apply-llm-batches.mjs" + (FULL ? "" : ""), KB_ROOT);

// 2. Build base tracker
run("node scripts/build-license-review-tracker.mjs", KB_ROOT);

// 3. Enrich
run("node scripts/enrich-license-tracker.mjs", KB_ROOT);

// 4. Sync to atlas
console.log("\n▶ Syncing to license-atlas...");
run(`node scripts/sync-tracker.mjs --kb-path "${KB_ROOT}"`, ROOT);

console.log("\n✅ Tracker full-chain update complete.");
