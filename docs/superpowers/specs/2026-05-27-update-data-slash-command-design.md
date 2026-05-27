# Design: `/update-data` Slash Command

Date: 2026-05-27

## Goal

Create a project-level slash command `.claude/commands/update-data.md` that automates the full data update workflow from KB crawling to license-atlas build. Claude loads it via `/update-data` and executes all phases sequentially.

## Principles

- KB is the single source of truth — all data originates there
- Terms entries are created in KB first, then flow through the normal pipeline
- Any phase failure stops the workflow and reports the error
- HF custom license review is the only manual interrupt point

## Phase 1: KB Data Collection

**Location**: `/Users/momo/Documents/workspace/KB`

Run:
```bash
cd /Users/momo/Documents/workspace/KB
bash scripts/update-all.sh --skip-atlas
```

This handles:
- License text crawling (6 sources: SPDX, OSI, tldrlegal, choosealicense, HuggingFace, OpenDataCommons)
- HF Hub stats (6 sources in parallel: models, datasets, license-tags, other-licenses, other-license-datasets, gated-licenses)
- GitHub stats (3 sources in parallel: license-trends, license-counts, agent-skills)
- Kaggle meta-license-tags
- HF custom license incremental merge with `incremental_update.py` — **pauses for human review of `temp/` directory**
- Data cleaning via `clean-licenses.mjs`

Output: `data/licenses/cleaned/{licenses.json, licenses-index.json, stats.json}`

If `--skip-fetch` is needed (data already crawled, only re-clean):
```bash
bash scripts/update-all.sh --skip-fetch --skip-atlas
```

## Phase 2: Terms Entry Update (in KB)

**Location**: `/Users/momo/Documents/workspace/KB`

Check all license entries with `terms` fields — verify every referenced `terms[].slug` exists as an entry. If missing:

1. **Crawl**: Use Jina Reader API (`https://r.jina.ai/{url}`) or webReader MCP tool to fetch Terms page content
2. **Clean**: Remove Jina meta headers, navigation menus, page footers, markdown formatting (`**`, `##`, `[](url)`, list markers), trailing whitespace
3. **Write to KB**: Create `data/licenses/texts/{slug}.md` with frontmatter:
   ```yaml
   ---
   title: "{Organization} {Type} Terms of Service"
   spdx_id: ""
   slug: "{slug}"
   type: agent
   tags: [Terms, Custom, Proprietary]
   proprietary: true
   sources: ["{source-url}"]
   created_at: {YYYY-MM-DD}
   ---
   {cleaned body text}
   ```
4. **Add `terms` field**: In the referencing license's markdown file, add `terms` frontmatter field with `name`, `url`, `slug`
5. **Re-clean**: Run `node scripts/clean-licenses.mjs` to regenerate cleaned output including the new Terms entry

Naming convention: `{Organization} {Type} Terms of Service` or `{Organization} {Product} Acceptable Use Policy`

## Phase 3: Sync to license-atlas

**Location**: `/Users/momo/Documents/workspace/license-atlas`

Copy 3 files from KB cleaned output:
```bash
cp /Users/momo/Documents/workspace/KB/data/licenses/cleaned/licenses.json src/data/licenses.json
cp /Users/momo/Documents/workspace/KB/data/licenses/cleaned/licenses-index.json src/data/licenses-index.json
cp /Users/momo/Documents/workspace/KB/data/licenses/cleaned/stats.json src/data/stats.json
```

Note: `update-all.sh` only copies `licenses.json` and `stats.json` — `licenses-index.json` must be copied separately.

## Phase 4: Rebuild Derivative Files

**Location**: `/Users/momo/Documents/workspace/license-atlas`

1. Rebuild search index:
   ```bash
   node scripts/build-search-index.mjs
   ```
2. Compare `src/data/cc-bodies/` files against KB source — if KB has newer CC body data, re-extract to `public/data/cc-bodies/`

## Phase 5: Update README Counts

**Location**: `/Users/momo/Documents/workspace/license-atlas`

Read latest numbers from `src/data/stats.json` and update:
- `README.md` — total count, by-type breakdown
- `README.zh-CN.md` — same

## Phase 6: Verify Build

**Location**: `/Users/momo/Documents/workspace/license-atlas`

1. `npm run build` — ensure static export succeeds
2. Report summary: total count change, by-type delta, any new entries added

## Error Handling

- Any command failure (non-zero exit) stops the workflow
- Report which phase failed and the error output
- Do not proceed to next phase until current phase succeeds

## Out of Scope

- KB crawler development or modification
- New tag/type additions to badge.tsx, page.tsx, or i18n.tsx (separate workflow)
- Deployment to GitHub Pages (automatic via push to main)
- Terms crawling for brand-new organizations not yet in the dataset

## Test Plan

1. **Dry run verification**: Execute `/update-data` with `--skip-fetch` on KB side to test sync+build pipeline without re-crawling
2. **Data integrity**: After sync, verify `licenses.json` entry count matches KB cleaned output count
3. **Search index**: Confirm `public/search-index.json` is regenerated and search works on homepage
4. **Build success**: `npm run build` completes without errors
5. **Terms round-trip**: Create a test Terms entry in KB, run full workflow, verify it appears in atlas
6. **README update**: Check that README counts match `stats.json` exactly
7. **Idempotency**: Run `/update-data` twice — second run should produce no changes (no diff in output files)
