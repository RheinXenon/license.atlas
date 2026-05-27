# /update-data — LicenseAtlas Full Data Update Workflow

Automate the complete data pipeline: KB crawling → cleaning → Terms sync → derivative rebuild → README update → build verification.

KB project is the single source of truth. All data modifications happen there first, then sync to license-atlas.

**Boundary rules**:
- KB is a separate project. NEVER attempt to commit, push, or manage KB's git state.
- You may run KB scripts and read/write KB data files as part of this workflow, but do not treat KB as your project.
- Only commit changes in license-atlas. KB changes are the user's responsibility.

**Before starting**, ask the user:
- "要全量爬取还是只重新清洗？（全量爬取需要较长时间）"
  - 全量: Phase 1 runs full crawl
  - 只清洗: Phase 1 skips crawl, only re-cleans

Then record baseline stats for comparison:
```bash
node -e "
const s = require('./src/data/stats.json');
console.log('Baseline:', JSON.stringify(s.by_type), 'Total:', s.total);
const d = require('./src/data/licenses.json');
require('fs').writeFileSync('/tmp/atlas-baseline-slugs.json', JSON.stringify(d.map(l => l.slug)));
"
```

---

## Phase 1: KB Data Collection

Work in `/Users/momo/Documents/workspace/KB`.

### If full crawl:

```bash
cd /Users/momo/Documents/workspace/KB && bash scripts/update-all.sh --skip-atlas
```

This script handles:
- License text crawling (SPDX, OSI, tldrlegal, choosealicense, HuggingFace, OpenDataCommons, Creative Commons)
- HF Hub stats (models, datasets, license-tags, other-licenses, other-license-datasets, gated-licenses) — parallel
- GitHub stats (license-trends, license-counts, agent-skills) — parallel
- Kaggle meta-license-tags
- HF custom license incremental merge (`incremental_update.py`)

**Important**: HF custom license merge may generate new files in `temp/` directory for human review. When `incremental_update.py` reports "New custom (temp/): N", you MUST:
1. List the new files: `ls data/hf-hub-stats/hf-custom-licenses/temp/` (exclude files already in manifest — they are stale)
2. Read each new file's content
3. Present to the user: name, source model, body preview
4. Ask the user: "确认移入 confirmed/ 还是跳过？"
5. If confirmed: follow the 6-step process printed by `update-all.sh` (review, LLM cleanup, rename, add created_at, mv to confirmed, run `--apply`)
6. If stale (already in manifest): `rm` the temp file
Do NOT proceed to cleaning until temp/ is cleared.

### If skip-fetch (re-clean only):

```bash
cd /Users/momo/Documents/workspace/KB && bash scripts/update-all.sh --skip-fetch --skip-atlas
```

### HF parquet download failure recovery:

The `update-all.sh` runs 6 HF sources in parallel, which can cause large parquet downloads (models ~1.1GB, datasets ~340MB) to timeout. If HF crawl fails with curl errors:

1. Download parquets sequentially:
   ```bash
   curl -sL --connect-timeout 30 --max-time 600 -o /Users/momo/Documents/workspace/KB/data/hf-hub-stats/.cache/models.parquet "https://huggingface.co/datasets/cfahlgren1/hub-stats/resolve/main/models.parquet"
   curl -sL --connect-timeout 30 --max-time 300 -o /Users/momo/Documents/workspace/KB/data/hf-hub-stats/.cache/datasets.parquet "https://huggingface.co/datasets/cfahlgren1/hub-stats/resolve/main/datasets.parquet"
   ```

2. Re-run HF sources sequentially:
   ```bash
   cd /Users/momo/Documents/workspace/KB
   node crawlers/hf_hub_stats_crawl.js --source license-tags
   node crawlers/hf_hub_stats_crawl.js --source other-licenses
   node crawlers/hf_hub_stats_crawl.js --source other-license-datasets
   node crawlers/hf_hub_stats_crawl.js --source gated-licenses
   ```

3. Apply HF custom license merge:
   ```bash
   python3 data/hf-hub-stats/hf-custom-licenses/incremental_update.py --apply
   ```
   Review any new entries in `temp/` — if they already exist in manifest, clean up stale temp files.

4. Re-crawl HF licenses with updated tags:
   ```bash
   node crawlers/licenses_crawl.js --source huggingface
   ```

### Verify Phase 1:

```bash
cd /Users/momo/Documents/workspace/KB && python3 -c "
import json
d = json.load(open('data/licenses/cleaned/stats.json'))
print(f'Total: {d[\"total\"]}')
print(f'OSI: {d[\"osi_approved\"]}  FSF: {d[\"fsf_libre\"]}  Proprietary: {d[\"proprietary\"]}')
print(f'By type: {json.dumps(d[\"by_type\"])}')
"
```

If the command fails, stop and report the error.

---

## Phase 2: Terms Entry Update (in KB)

Work in `/Users/momo/Documents/workspace/KB`.

`clean-licenses.mjs` now supports:
- `terms` frontmatter field on any license entry → passed through to cleaned output
- `type: terms` frontmatter → preserved (not overridden by `inferType`)
- `tags` frontmatter → merged with `tldr_tags` into output tags

Terms entries live in `data/licenses/texts/{slug}.md` with `type: terms` and `tags: [Terms, Custom, Proprietary]`.
Terms references are in HF/GH custom license files under `confirmed/` and standard license files under `texts/`.

### Check for missing Terms entries:

```bash
cd /Users/momo/Documents/workspace/KB
node -e "
const d = JSON.parse(require('fs').readFileSync('data/licenses/cleaned/licenses.json','utf8'));
const withTerms = d.filter(l => l.terms);
const termSlugs = new Set();
withTerms.forEach(l => l.terms.forEach(t => termSlugs.add(t.slug)));
const allSlugs = new Set(d.map(l => l.slug));
const missing = [...termSlugs].filter(s => !allSlugs.has(s));
if (missing.length === 0) {
  console.log('All', termSlugs.size, 'referenced Terms entries exist. No new Terms to add.');
} else {
  console.log('Missing Terms entries:', missing.length);
  missing.forEach(s => console.log(' -', s));
}
"
```

### If missing Terms entries:

For each missing Terms slug:

1. **Find the URL**: Get it from the `terms` field of the referencing license entry.

2. **Crawl**: Use Jina Reader API or webReader MCP tool:
   ```
   https://r.jina.ai/{terms-url}
   ```

3. **Clean the content** — remove:
   - Jina meta headers (lines starting with `Title:`, `URL Source:`, `Markdown Content:`)
   - Navigation menus (content before the actual heading/body start)
   - Page footers (Cookie policy, company info, etc.)
   - Markdown formatting: `**`, `__`, `##`, `[](url)`, `![](url)`, `*   ` list markers
   - Excess blank lines and trailing whitespace

4. **Create KB source file** at `data/licenses/texts/{slug}.md`:
   ```markdown
   ---
   title: "{Organization} {Type} Terms of Service"
   spdx_id: ""
   slug: "{slug}"
   type: terms
   tags: [Terms, Custom, Proprietary]
   proprietary: true
   sources: ["{source-url}"]
   created_at: {today YYYY-MM-DD}
   ---

   {cleaned body text}
   ```

   Naming: `{Organization} {Type} Terms of Service` or `{Organization} {Product} Acceptable Use Policy`

5. **Re-run clean** to include new Terms in output:
   ```bash
   cd /Users/momo/Documents/workspace/KB && node scripts/clean-licenses.mjs
   ```

6. Verify the new Terms entry appears in cleaned output:
   ```bash
   node -e "
   const d = JSON.parse(require('fs').readFileSync('data/licenses/cleaned/licenses.json','utf8'));
   const found = d.find(l => l.slug === '{slug}');
   console.log(found ? 'Found: ' + found.title + ' type=' + found.type + ' tags=' + found.tags?.join(',') : 'NOT FOUND');
   "
   ```

---

## Phase 3: Sync to license-atlas

Work in `/Users/momo/Documents/workspace/license-atlas`.

```bash
cp /Users/momo/Documents/workspace/KB/data/licenses/cleaned/licenses.json src/data/licenses.json && \
cp /Users/momo/Documents/workspace/KB/data/licenses/cleaned/licenses-index.json src/data/licenses-index.json && \
cp /Users/momo/Documents/workspace/KB/data/licenses/cleaned/stats.json src/data/stats.json
```

Note: `update-all.sh` only copies `licenses.json` and `stats.json`. The `licenses-index.json` copy is critical — the homepage filter pills read tags from this file.

Verify entry count:
```bash
node -e "
const full = require('./src/data/licenses.json');
const idx = require('./src/data/licenses-index.json');
const stats = require('./src/data/stats.json');
console.log('licenses.json:', full.length, 'entries');
console.log('licenses-index.json:', idx.length, 'entries');
console.log('stats.json total:', stats.total);
if (full.length !== idx.length) console.log('WARNING: count mismatch!');
if (full.length !== stats.total) console.log('WARNING: stats mismatch!');
console.log('By type:', JSON.stringify(stats.by_type));
"
```

---

## Phase 4: Rebuild Derivative Files

Work in `/Users/momo/Documents/workspace/license-atlas`.

### Rebuild search index:

```bash
node scripts/build-search-index.mjs
```

### CC multilingual bodies:

Skip. CC bodies in KB use `.txt` format, while atlas uses pre-built `.json` in `public/data/cc-bodies/`. These are not synced through this workflow.

---

## Phase 5: Update README Counts

Work in `/Users/momo/Documents/workspace/license-atlas`.

Read latest stats:
```bash
node -e "const s = require('./src/data/stats.json'); console.log(JSON.stringify(s, null, 2));"
```

Update these files with new counts:
- `README.md` — total license count, by-type breakdown
- `README.zh-CN.md` — same

Search for the existing count numbers and replace them.

---

## Phase 6: Verify Build

```bash
npm run build
```

---

## Phase 7: Update Summary

After build succeeds, generate a detailed summary by comparing baseline stats with new data.

### Step 1: Diff old vs new licenses

```bash
node -e "
const oldSlugs = new Set(require('/tmp/atlas-baseline-slugs.json'));
const newLicenses = require('./src/data/licenses.json');
const newSlugs = new Set(newLicenses.map(l => l.slug));

const added = [...newSlugs].filter(s => !oldSlugs.has(s));
const removed = [...oldSlugs].filter(s => !newSlugs.has(s));

if (added.length > 0) {
  console.log('### Added (' + added.length + '):');
  added.forEach(s => {
    const l = newLicenses.find(x => x.slug === s);
    console.log('  + ' + l.title + ' [' + l.type + ']');
  });
}
if (removed.length > 0) {
  console.log('### Removed (' + removed.length + '):');
  removed.forEach(s => console.log('  - ' + s));
}
"
```

### Step 2: Summary report

Output the following to the user:

```
## 更新完成

**数据变化**: {old_total} → {new_total} ({delta})

**按类型**:
| Type | Old | New | Δ |
|------|-----|-----|---|
| Software | {old} | {new} | {±n} |
| Model | ... | ... | ... |
| Data | ... | ... | ... |
| Agent | ... | ... | ... |
| Terms | ... | ... | ... |

**新增许可证**: (list titles with type)
- {title} [{type}]

**移除许可证**: (list slugs — usually dedup merges)
- {slug}

**Terms 变化**: added N new Terms entries (list if any)

**构建**: {pages} pages, success
```

If no licenses were added or removed, say "无新增或移除，数据仅重新清洗。"

### Step 3: Save baseline for next run

```bash
node -e "
const d = require('./src/data/licenses.json');
require('fs').writeFileSync('/tmp/atlas-baseline-slugs.json', JSON.stringify(d.map(l => l.slug)));
" && echo "Baseline saved for next run"
```

**Important**: Also save baseline at the start of each run (before Phase 1) so Phase 7 can diff:
```bash
node -e "
const d = require('./src/data/licenses.json');
require('fs').writeFileSync('/tmp/atlas-baseline-slugs.json', JSON.stringify(d.map(l => l.slug)));
"
```

---

## Error Handling

- Any command failure (non-zero exit code) → stop immediately, report the error
- Do NOT proceed to next phase until current phase succeeds
- If HF parquet downloads fail → use the sequential download recovery steps in Phase 1
- If HF crawl tokens are expired or rate-limited → inform the user and suggest `--skip-fetch` for just the clean+sync steps
