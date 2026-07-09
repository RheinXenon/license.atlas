import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const GENERATED_INDEX = resolve(ROOT, "src", "data", "generated-osadl-checklists-v34-index.json");
const COVERAGE_OUTPUT = resolve(ROOT, "src", "data", "generated-osadl-coverage.json");

function stableSort(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

async function main() {
  const generated = JSON.parse(await readFile(GENERATED_INDEX, "utf8"));
  const bySlug = generated.by_slug || {};
  const slugs = stableSort(
    Object.keys(bySlug)
      .map((slug) => slug.trim().toLowerCase())
      .filter(Boolean),
  );

  const payload = {
    _meta: {
      generated_at: generated._meta?.generated_at || "",
      source_hash: generated._meta?.source_hash || "",
      source: generated._meta?.source || "LicenseAtlas Generated OSADL-style Checklists",
      source_kind: "generated",
      record_count: slugs.length,
      matched_slugs: slugs.length,
    },
    slugs,
  };

  const next = `${JSON.stringify(payload, null, 2)}\n`;
  let current = "";
  try {
    current = await readFile(COVERAGE_OUTPUT, "utf8");
  } catch {
    // First run.
  }

  if (current !== next) {
    await writeFile(COVERAGE_OUTPUT, next, "utf8");
    console.log(`Generated OSADL coverage: ${slugs.length} slugs -> src/data/generated-osadl-coverage.json`);
  } else {
    console.log(`Generated OSADL coverage unchanged: ${slugs.length} slugs`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
