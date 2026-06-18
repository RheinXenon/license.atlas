// Sync OSI License Review Tracker from KB → license-atlas.
// Hash-gated: no-op when KB v2.json is unchanged (idempotent).
// Run: node scripts/sync-tracker.mjs [--kb-path <path>]
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Resolve KB path: --kb-path flag, else env, else ../KB relative to atlas.
function resolveKbPath() {
  const flagIdx = process.argv.indexOf("--kb-path");
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) return resolve(process.argv[flagIdx + 1]);
  if (process.env.KB_PATH) return resolve(process.env.KB_PATH);
  return resolve(ROOT, "..", "KB");
}
const KB_ROOT = resolveKbPath();
const KB_V2 = resolve(KB_ROOT, "data", "osi", "license-review-tracker-v2.json");

if (!existsSync(KB_V2)) {
  console.error(`✗ KB v2.json not found: ${KB_V2}`);
  console.error("  Pass --kb-path <path> or set KB_PATH env.");
  process.exit(1);
}

const ATLAS_FULL = resolve(ROOT, "public", "data", "tracker.json");
const ATLAS_INDEX = resolve(ROOT, "src", "data", "tracker-index.json");

// ── Compute source hash from KB v2.json ──
const kbRaw = readFileSync(KB_V2, "utf8");
const kbData = JSON.parse(kbRaw);
const hashInput = JSON.stringify({
  n: kbData.submissions.length,
  enriched_at: kbData.meta?.enriched_at || "",
  sig: kbData.submissions
    .map((s) => `${s.id}:${s.status}:${(s.timeline || []).length}`)
    .join("|"),
});
const sourceHash = createHash("sha1").update(hashInput).digest("hex").slice(0, 16);

// ── Idempotency check ──
if (existsSync(ATLAS_INDEX)) {
  try {
    const existing = JSON.parse(readFileSync(ATLAS_INDEX, "utf8"));
    if (existing?._meta?.source_hash === sourceHash) {
      console.log(`✓ tracker 无变化 (hash ${sourceHash})，跳过同步`);
      process.exit(0);
    }
  } catch {
    // index corrupt → regenerate below
  }
}

// ── spdx normalize (lowercase, trimmed) for matching robustness ──
const normSpdx = (s) => (s || "").trim().toLowerCase();

// ── Build lightweight index keyed by normalized spdx_id ──
const index = {
  _meta: {
    source_hash: sourceHash,
    generated_at: kbData.meta?.enriched_at || kbData.meta?.generated_at || "",
    total_submissions: kbData.submissions.length,
    by_status: kbData.meta?.by_status || {},
  },
};

// Also keep an id-keyed list for /tracker lookup by ?focus= (id or spdx).
const byKey = {};
for (const s of kbData.submissions) {
  const tl = s.timeline || [];
  const entry = {
    id: s.id,
    name: s.name,
    spdx_id: s.spdx_id || "",
    status: s.status,
    submitter: s.submitter?.name || "Unknown",
    stats: {
      total_messages: s.stats?.total_messages || 0,
      duration_days: s.stats?.duration_days || 0,
      date_range: s.stats?.date_range || [],
    },
    has_vote: !!s.board_vote,
    has_timeline: tl.length > 0,
    timeline_meta: {
      count: tl.length,
      first: tl.length ? tl[0].date : null,
      last: tl.length ? tl[tl.length - 1].date : null,
    },
  };
  // Key by normalized spdx if present, else by id
  const key = s.spdx_id ? normSpdx(s.spdx_id) : normSpdx(s.id);
  byKey[key] = entry;
  if (s.spdx_id) byKey[normSpdx(s.id)] = entry; // also allow id lookup
}
Object.assign(index, byKey);

// ── Write outputs ──
mkdirSync(dirname(ATLAS_FULL), { recursive: true });
copyFileSync(KB_V2, ATLAS_FULL);
writeFileSync(ATLAS_INDEX, JSON.stringify(index, null, 2));

console.log(`✓ 同步 ${kbData.submissions.length} submissions → public/data/tracker.json + src/data/tracker-index.json`);
console.log(`  source_hash: ${sourceHash}`);
console.log(`  by_status: ${JSON.stringify(kbData.meta?.by_status || {})}`);
