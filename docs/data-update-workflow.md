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
   - Runs `../KB/scripts/update-all.sh --skip-atlas` by default.
   - Crawls standard license full texts via `crawlers/licenses_crawl.js`.
   - Crawls ScanCode LicenseDB via `crawlers/scancode_crawl.js`.
   - Refreshes HuggingFace, GitHub, and Kaggle popularity inputs. HuggingFace
     refresh includes both license tag counts and `license-trends.json`; the
     trend file is keyed to the current `models.parquet` ETag and feeds the
     license-card sparkline data.
   - Processes HuggingFace custom license discoveries and pauses for the KB
     review workflow when new custom texts appear. The script only produces
     mechanical candidates; final name, slug, description, and dedupe decisions
     require LLM-assisted review before confirmation.
   - Runs `../KB/scripts/gh-custom-license-incremental-update.py --apply` after
     the `agent-skills` crawl. The script records standard GitHub raw files as
     processed, merges sources into existing confirmed custom licenses, and
     writes only genuinely new custom candidates to
     `gh-custom-licenses/temp/` for user confirmation.
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
   - Can be refreshed independently with `npm run update:projects`; use
     `npm run update:projects -- --source huggingface --force` when only the
     HuggingFace trending-score / likes-fallback ranking needs to be refreshed.

5. **Build verification**
   - Runs `npm run build`, which rebuilds the search index, syncs committed
     sidecars again if needed, and produces the static export.

## Incremental Behavior

The full update is incremental by default:

- Core license sources use each crawler's local `crawl_state.json` and source
  freshness checks.
- HuggingFace trend data is a derived artifact from `models.parquet`. The
  update flow must run `hf_hub_stats_crawl.js --source license-trends` after the
  model parquet refresh; the crawler compares `source_model_etag` with the
  current models ETag and re-extracts when they differ.
- HuggingFace custom licenses follow the strict KB review workflow by default:
  new custom texts are written to
  `../KB/data/hf-hub-stats/hf-custom-licenses/temp/`, then must be manually
  deduplicated, LLM-cleaned, renamed, confirmed, and applied before they can
  enter the cleaned corpus. URL-shaped titles, sentence fragments, SPDX lines,
  and near-duplicates must be rejected or merged during this review.
- GitHub custom licenses follow the same confirmation principle, but their
  crawler output lands in `../KB/data/github-stats/gh-custom-licenses/raw/`.
  `gh-custom-license-incremental-update.py --apply` first separates standard
  licenses, merges known custom duplicates, and writes only unresolved custom
  candidates to `temp/`. Raw files and `is_standard` manifest entries are not
  loaded by `clean-licenses.mjs`; only non-standard entries present in
  `gh-custom-licenses/confirmed/manifest.json` are eligible for Atlas.
- License full-text discovery is also not treated as final on crawl alone.
  Crawlers and cleanup scripts can flag candidate titles/texts, but suspicious
  titles or ambiguous text boundaries must be resolved with LLM-assisted review
  in KB before Atlas is allowed to sync newly discovered slugs.
- ScanCode LicenseDB is treated as a trusted structured source. New ScanCode
  slugs may sync automatically after `clean-licenses.mjs` has run, because the
  KB clean step already performs dedupe/merge against the existing corpus.
  This exception does not apply to HuggingFace/GitHub scraped custom texts,
  generic external HTML pages, or suspicious title extraction results.
- Atlas blocks new license slugs by default during `sync-license-corpus`. If the
  KB cleaned corpus contains previously unseen untrusted slugs, sync stops and
  prints the candidate list. After the KB-side dedupe / cleanup / confirmation
  workflow is complete, rerun with `--allow-new-licenses`.
- Tracker mail refresh defaults to recent months. Use `--since YYYY-MM`,
  `--month YYYY-MM`, or `--recent N` to adjust the OSI mail window.
- Sync scripts are hash-gated; unchanged outputs are not rewritten.

## Commands

```bash
# Full incremental update. Stops for LLM-assisted HF custom review and blocks unconfirmed new slugs.
npm run update:data

# Sync newly confirmed license slugs only after KB dedupe + LLM cleanup is complete.
npm run update:data -- --allow-new-licenses

# Sync only selected newly confirmed slugs while leaving other unreviewed
# candidates blocked. Repeat the flag once per reviewed slug.
npm run sync:licenses -- --allow-new-license <confirmed-slug>

# Not recommended: skip the interactive HF custom prompt. Atlas still blocks
# previously unseen license slugs unless --allow-new-licenses is also supplied.
npm run update:data -- --skip-confirm

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
npm run sync:licenses
npm run update:data -- --skip-core --skip-tracker --skip-osadl --skip-projects --skip-build
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

## Required Update Summary

Every completed data update must end with a Markdown summary table. This is
required even when the update is partially blocked, because blocked candidates
are part of the audit trail.

Use this template in the final report:

| Area | Status | Count / Change | Evidence | Notes |
|---|---|---:|---|---|
| Core license corpus | synced / blocked / unchanged | before -> after | `source_hash`, changed files | Include new, removed, merged, or blocked slugs. |
| License full-text discovery | reviewed / pending / unchanged | raw / temp / confirmed | KB paths or script output | State whether LLM-assisted name/text cleanup was completed. |
| HF custom licenses | reviewed / pending / unchanged | raw / merged / confirmed / blocked | manifest/temp counts | List confirmed slugs and unresolved candidates. |
| GitHub source | updated / skipped / failed | source counts or skipped reason | crawler output | Covers trends, repo counts, and agent-skills custom licenses. |
| HuggingFace source | updated / skipped / failed | parquet/list/raw/trend counts | ETags or crawler output | Include stale-list rebuilds and `license-trends` re-extraction when they happen. |
| Kaggle source | updated / skipped / failed | version / license count | cache version | Note that Kaggle contributes popularity only. |
| OSI Tracker | updated / skipped / failed | submissions/events/texts | tracker hash or build output | Include `license-review` and `license-discuss` mail windows. |
| OSADL sidecar | updated / skipped / failed | checklist count/hash | timestamp/hash | Mention checklist timestamp when available. |
| Popular Projects | updated / skipped / failed | records/hash | source fingerprints | Include GitHub/HF/Kaggle refresh scope and whether HF used `trendingScore` or likes fallback. |
| Verification | pass / fail / skipped | commands | command output summary | Include build, tests, and browser checks when relevant. |

Rules:

- Report blocked candidates explicitly; do not bury them in prose.
- If a source is intentionally skipped by freshness gates, write `skipped` with
  the gate reason.
- If browser validation is relevant but not run, write `skipped` and why.
- Prefer exact hashes, counts, and changed slugs over general statements.

## Source Of Truth

- KB remains the source of truth for crawled/raw/cleaned data.
- Atlas stores committed, deployable data snapshots under `src/data/` and
  `public/data/`.
- The legacy KB reference for core license updates is
  `../KB/docs/license-update-guide.md`; this document is the Atlas-side entry
  point that ties the core corpus and sidecars together.
