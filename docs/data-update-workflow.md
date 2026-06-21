# LicenseAtlas Data Update Workflow

LicenseAtlas has one full incremental update entry point:

```bash
npm run update:data
```

This command is the preferred operational entry point. It updates the core
license corpus first, then refreshes sidecar data used by detail pages and the
tracker.

## Update Order

1. **Core license corpus** in the sibling KB checkout
   - Runs `../KB/scripts/update-all.sh --skip-atlas --skip-confirm`.
   - Crawls standard license full texts via `crawlers/licenses_crawl.js`.
   - Crawls ScanCode LicenseDB via `crawlers/scancode_crawl.js`.
   - Refreshes HuggingFace, GitHub, and Kaggle popularity inputs.
   - Processes HuggingFace custom license discoveries.
   - Runs `../KB/scripts/clean-licenses.mjs`.
   - Syncs `licenses.json`, `licenses-index.json`, and `stats.json` into Atlas
     through `scripts/sync-license-corpus.mjs`.

2. **OSI License Review Tracker**
   - Runs `scripts/update-tracker.mjs`.
   - Incrementally refreshes recent `license-review` and `license-discuss`
     archives, rebuilds tracker data, verifies submitted license text records,
     and syncs `public/data/tracker.json` plus tracker indexes.

3. **OSADL checklist sidecar**
   - Runs `scripts/update-osadl.mjs`.
   - Uses OSADL timestamp gates and Atlas-side hash gates.

4. **Popular Projects sidecar**
   - Runs `scripts/update-project-showcase.mjs`.
   - Uses GitHub per-license freshness, HuggingFace parquet fingerprint, Kaggle
     Meta-Kaggle version, and Atlas-side hash gates.

5. **Build verification**
   - Runs `npm run build`, which rebuilds the search index, syncs committed
     sidecars again if needed, and produces the static export.

## Incremental Behavior

The full update is incremental by default:

- Core license sources use each crawler's local `crawl_state.json` and source
  freshness checks.
- HuggingFace custom licenses are handled conservatively. The default
  non-interactive mode applies known/auto-classified matches and leaves new
  custom licenses in `../KB/data/hf-hub-stats/hf-custom-licenses/temp/` for
  review. Use `--review-hf-custom` when you want the script to pause for manual
  review.
- Tracker mail refresh defaults to recent months. Use `--since YYYY-MM`,
  `--month YYYY-MM`, or `--recent N` to adjust the OSI mail window.
- Sync scripts are hash-gated; unchanged outputs are not rewritten.

## Commands

```bash
# Full incremental update, non-interactive HF custom handling.
npm run update:data

# Full update, but pause for HF custom license review.
npm run update:data -- --review-hf-custom

# Refresh from a specific OSI mail month onward.
npm run update:data -- --since 2026-06

# Rebuild/sync from existing KB data, without crawling the core license corpus.
npm run update:data -- --skip-fetch

# Skip expensive Next build while debugging data sync.
npm run update:data -- --skip-build
```

## Local Validation

Use this sequence when changing update scripts:

```bash
node --check scripts/update-data.mjs
node --check scripts/sync-license-corpus.mjs
npm run update:data -- --skip-fetch --skip-tracker --skip-osadl --skip-projects --skip-build
npx tsc --noEmit
npm run lint
npm run build
```

For UI-affecting data changes, run a local dev server and inspect at least:

- `/`
- `/licenses/apache-2.0`
- `/tracker`

The detail page should show core license metadata, OSI Review Tracker status,
OSADL checklist data when available, and Popular Projects when a sidecar record
exists.

## Source Of Truth

- KB remains the source of truth for crawled/raw/cleaned data.
- Atlas stores committed, deployable data snapshots under `src/data/` and
  `public/data/`.
- The legacy KB reference for core license updates is
  `../KB/docs/license-update-guide.md`; this document is the Atlas-side entry
  point that ties the core corpus and sidecars together.
