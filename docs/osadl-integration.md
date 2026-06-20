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

## UI

License detail pages call `resolveOsadlChecklist(license)` by SPDX ID.

When a checklist exists, `OsadlChecklistBlock` renders:

- Copyleft
- Source Disclosure
- Patent Hints
- OSADL Data Timestamp
- Use Cases
- Conditions
- Must / Must Not previews
- Compatibility Summary
- Raw checklist/source links
- OSADL attribution, CC-BY-4.0 license note, draft note, and disclaimer

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

- Apache-2.0, MIT, and GPL-2.0-only show the OSADL checklist block.
- GPL-3.0 currently does not show OSADL because Atlas stores it as legacy `GPL-3.0`, while OSADL uses `GPL-3.0-only` / `GPL-3.0-or-later`.
- Desktop and mobile layouts have no horizontal overflow.
- Dark mode renders the OSADL block legibly.
- Production static pages report no console errors.

## Source Notice

OSADL checklist data is attributed to Open Source Automation Development Lab (OSADL) eG and distributed by OSADL as CC-BY-4.0 raw data. OSADL's own disclaimer and draft/work-in-progress note are displayed in the UI.
