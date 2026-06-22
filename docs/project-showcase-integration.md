# Project Showcase Integration

LicenseAtlas exposes a compact `Popular Projects` block on selected license detail pages. The block is a sidecar, not core license metadata: it surfaces representative GitHub repositories, HuggingFace models, and Kaggle datasets for licenses that cross a visibility threshold.

## Scope

Current rollout shows showcase data for **31** licenses.

Selection is computed in KB by `scripts/build-project-showcase.mjs`:

- GitHub repositories: `>= 10,000` stars
- Kaggle datasets: `>= 1,000` votes
- HuggingFace models: Atlas aggregate popularity `>= 1,000`
- Or source-local top-item evidence:
  - GitHub top repository `>= 10,000` stars
  - HuggingFace top model `trendingScore >= 100`
  - Kaggle top dataset `>= 1,000` votes

GitHub and HuggingFace are capped at top 10 items per license; Kaggle stays capped
at top 5 to keep the sidecar compact. Ranking uses source-native social signals:

- GitHub: stars
- HuggingFace: local Hub `trendingScore`, with downloads and likes as tie-breakers
- Kaggle: votes

If a HuggingFace license group has a top `trendingScore` below `5`, the group is
treated as having no meaningful active trend signal. In that case the crawler
falls back to likes. It stores a compact top 5 when the fifth item has `<= 5`
likes; when the fifth item has more than 5 likes, it keeps the full top 10.

## Data Flow

Source of truth lives in the sibling KB repository:

- `../KB/data/project-showcase/project-showcase.json`
- `../KB/data/project-showcase/project-showcase-index.json`
- `../KB/data/project-showcase/match-report.json`

Atlas consumes those outputs through:

```bash
npm run sync:projects
```

Full-chain update:

```bash
npm run update:projects
```

The build pipeline also runs project-showcase sync automatically:

```bash
npm run build
```

Generated Atlas files:

- `public/data/project-showcase.json`
- `src/data/project-showcase-index.json`
- `src/data/project-showcase-meta.json`

## KB Update Stages

`scripts/update-project-showcase.mjs` orchestrates the full chain:

1. `crawlers/project_showcase_crawl.js`
2. `scripts/build-project-showcase.mjs --atlas-index <licenses-index.json>`
3. `scripts/test-project-showcase-data.mjs`
4. `scripts/sync-project-showcase.mjs --kb-path <KB>`

## Incremental Behavior

The updater is incremental at multiple layers:

- **GitHub**: per-license freshness window; unchanged license keys are skipped for 7 days.
- **HuggingFace**: gated by local `models.parquet` fingerprint (`size:mtimeMs`); records rank by the parquet `trendingScore` unless the top score is below `5`, in which case the group falls back to likes and keeps top 5 or top 10 based on the fifth item's like count.
- **Kaggle**: gated by latest Meta-Kaggle cache version id; URL/thumbnail metadata is resolved through the Kaggle API and cached in crawl state.
- **Atlas sync**: hash-gated; unchanged sidecars are not rewritten.

The builder includes a license when either Atlas aggregate counters cross the rollout threshold or raw source data contains a clearly popular top item. This keeps the showcase broad enough for strong single-source evidence (for example zlib via GitHub stars and CDLA-Permissive-2.0 via HuggingFace trending score) without lowering the global long-tail floor.

Useful commands:

```bash
npm run update:projects                         # normal incremental refresh
npm run update:projects -- --force              # force source refresh
npm run update:projects -- --only mit           # targeted license refresh
npm run update:projects -- --only mit --force   # force one license path
npm run update:projects -- --source huggingface --force  # force one source only
npm run update:projects -- --source huggingface --force --skip-test  # quick HF ranking-only refresh
npm run update:projects -- --skip-crawl         # rebuild/sync existing KB outputs
npm run update:projects -- --skip-test          # skip KB data checks
```

`--only` now applies to GitHub, HuggingFace, and Kaggle refresh paths. For HuggingFace and Kaggle it updates only the requested license keys while preserving cached records for every other license in the raw sidecar files.
`--source` / `--sources` limits the crawl stage to one or more sources (`github`, `huggingface`, `kaggle`) while preserving the cached raw sidecar data for skipped sources. Use this when only one source's extraction or ranking logic changed, such as the HuggingFace `trendingScore` ranking switch.

## UI

The Atlas detail page resolves `resolveProjectShowcase(license)` and renders a right-rail `Popular Projects` block when showcase data exists.

Current behavior:

- Desktop right rail on license detail pages
- Licenses without a showcase entry use a centered single-column detail layout
- Source-grouped sections: `GitHub`, `HuggingFace`, `Kaggle`
- Compact static placement, aligned with the license tag row rather than a sticky rail
- Remote icons where available
  - GitHub owner avatar
  - HuggingFace org/user avatar
  - Kaggle dataset thumbnail resolved from the Kaggle API
- Project labels omit repeated owner/source prefixes in the compact view
- Link-out on each item

No showcase block is rendered when a license has no matched showcase entry.

## Validation

Required checks:

```bash
node --check ../KB/crawlers/project_showcase_crawl.js
node --check scripts/sync-project-showcase.mjs
node --check scripts/update-project-showcase.mjs
node ../KB/scripts/test-project-showcase-data.mjs
npx tsc --noEmit
npm run lint
npm run build
```

Incremental verification runbook:

```bash
npm run update:projects
npm run update:projects                         # expect source skips + sync skip
npm run update:projects -- --only mit --force  # targeted refresh path
npm run update:projects -- --source huggingface --force  # source-only refresh path
```

Expected evidence:

- repeat full run: GitHub freshness skips, HuggingFace fingerprint skip, Kaggle version skip
- repeat sync: `Project showcase unchanged ..., skip sync`
- targeted run: only requested license key refreshes on GitHub; HuggingFace/Kaggle retain non-target cached records
- source-only run: selected source refreshes while skipped sources keep their cached records

Browser checks:

- `/licenses/mit` renders `Popular Projects`, `GitHub`, and OSADL block together without layout collision
- `/licenses/apache-2.0` renders tracker + OSADL + showcase together; HuggingFace entries display trend scores
- `/licenses/cc-by-4.0` renders showcase even without OSADL
- `/tracker` still loads and sorts by recent activity after showcase changes

## 2026-06-21 Verification Snapshot

Validated locally during the full refresh:

- `npm run update:projects` produced **26** showcase records in the first rollout
- immediate rerun skipped GitHub/HuggingFace/Kaggle source refresh and skipped Atlas sync
- `npm run update:projects -- --only mit --force --skip-test` completed successfully after fixing `--only` handling for HuggingFace/Kaggle
- `npm run update:projects -- --source huggingface --force` refreshes only HuggingFace data, rebuilds the showcase sidecar, and verifies the detail UI displays HuggingFace trend scores
- `npm run update:projects -- --source huggingface --force` after adding the HF `trendingScore`/likes fallback refreshed only the HuggingFace source and rebuilt **31** showcase records
- `npm run build` completed successfully with project-showcase sync in the build chain
