# OSADL Checklist Integration

License Atlas consumes OSADL Open Source License Checklists as a sidecar data source.

## Scope

OSADL checklist data is license-level compliance metadata: obligations, prohibitions, use cases, copyleft/source-disclosure signals, patent hints, and directional compatibility summaries.

It is not license text and is not merged into `src/data/licenses.json`.

## Data Flow

Source of truth lives in the sibling KB repository:

- `../KB/data/osadl/checklists/osadl-checklists.json`
- `../KB/data/osadl/checklists/osadl-checklists-index.json`
- `../KB/data/osadl/checklists/match-report.json`

Atlas sync command:

```bash
npm run sync:osadl
```

The build pipeline also runs the sync:

```bash
npm run build
```

Generated Atlas files:

- `public/data/osadl-checklists.json` — full normalized OSADL sidecar for future lazy-load tools.
- `src/data/osadl-checklists-index.json` — compact SPDX-keyed detail index for license pages.
- `src/data/osadl-meta.json` — source metadata, attribution, timestamps, and match counts.

`scripts/sync-osadl.mjs` is hash-gated. If KB data is unavailable in CI but committed Atlas sidecar files exist, the script keeps using committed data.

The sync script also computes an Atlas-display coverage count. This differs from the raw KB `match-report.json` count because LicenseAtlas can resolve a few extra OSADL records through page-level aliases:

- Deprecated GNU SPDX IDs: `GPL-1.0`, `GPL-2.0`, `GPL-3.0`, `LGPL-2.0`, and `LGPL-2.1` resolve to the corresponding `*-only` OSADL checklist.
- ScanCode pages without SPDX IDs resolve by Atlas slug:
  - `bsla-no-advert` -> `LicenseRef-scancode-bsla-no-advert`
  - `info-zip-2003-05` -> `LicenseRef-scancode-info-zip-2003-05`
  - `ppp` -> `LicenseRef-scancode-ppp`
  - `bzip2-libbzip-1.0.5` -> `bzip2-1.0.5`

Current display coverage: **120 / 121** OSADL records. The remaining record is `GPL-2.0-only WITH Classpath-exception-2.0`, an SPDX license expression rather than a standalone LicenseAtlas license page.

## UI

License detail pages call `resolveOsadlChecklist(license)` by SPDX ID and selected slug aliases.

When a checklist exists, `OsadlChecklistBlock` renders a compact, collapsed summary by default:

- Copyleft
- Source Disclosure
- Patent Hints
- OSADL Data Timestamp
- A click-to-expand `[+]` affordance on the surrounding OSADL box

Expanded content includes:

- `Checklist Actions` as a compact ASCII-style action tree grouped by condition, with `[Must]` / `[Must Not]` action markers.
- `Compatibility Summary` with colored segments and matching colored count labels.
- Raw checklist/source links.

Long action lists are previewed in-page and linked to the raw checklist for complete detail.

## Validation

Required checks:

```bash
node --check scripts/sync-osadl.mjs
npm run sync:osadl
npm run sync:osadl
npx tsc --noEmit
npm run lint
npm run build
```

Browser checks:

- Apache-2.0, MIT, GPL-2.0-only, and GPL-3.0 show the OSADL checklist block.
- Alias-only ScanCode pages show OSADL: `bsla-no-advert`, `info-zip-2003-05`, `ppp`, and `bzip2-libbzip-1.0.5`.
- The OSADL box is collapsed by default; clicking the box expands it, while clicking stat chips, `Checklist Actions`, `Compatibility Summary`, source links, and compatibility popovers does not collapse it.
- Desktop and mobile layouts have no horizontal overflow.
- Dark mode renders the OSADL block legibly.
- Production static pages report no console errors.

## Source Notice

OSADL checklist data is attributed to Open Source Automation Development Lab (OSADL) eG and distributed by OSADL as CC-BY-4.0 raw data. OSADL's own disclaimer and draft/work-in-progress note are displayed in the UI.
