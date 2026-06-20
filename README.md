# LicenseAtlas

English | [中文](README.zh-CN.md)

A comprehensive collection of **2,588** software, AI model, data, agent, and terms licenses — searchable, filterable, and available in English and Chinese.

**Live site**: [LicenseAtlas](https://morningd.github.io/license.atlas)

## Features

- **Full-text search** — search license name, SPDX id, source, and body text, with fuzzy matching and exact/prefix SPDX-slug matches ranked first (powered by MiniSearch)
- **Category filters** — software, model, data, agent, terms
- **Tag filters** — Permissive, Copyleft, Creative Commons, Hardware, etc.
- **Popularity & trends** — sparkline charts from HuggingFace, GitHub, and Kaggle data
- **[OSI License Review Tracker](https://morningd.github.io/license.atlas/tracker)** (`/tracker`) — live board of 174 OSI license submissions, review status, board votes, timelines, and linked license-text history
- **Bilingual UI** — English/Chinese with automatic browser language detection
- **Dark mode** — system preference + manual toggle
- **Static export** — 2,588 pre-rendered pages, fast loading

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, static export)
- [MiniSearch](https://github.com/lucaong/minisearch) (client-side full-text search)
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript

## Development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # static export to out/
```

## Data Sources

License texts are aggregated from:

| Source | Coverage |
|--------|----------|
| SPDX | 695 licenses |
| TLDRLegal | 145 licenses |
| OSI | 122 approved licenses |
| GNU / FSF | 66 licenses |
| Creative Commons | 37 licenses |
| choosealicense.com | 47 licenses |
| ScanCode LicenseDB | Custom license texts and metadata |
| Blue Oak Council | Permissive-license quality ratings |
| HuggingFace Hub | Custom model & dataset licenses |
| GitHub | Agent skill, MCP server, and tool licenses |
| Open Data Commons | 3 data licenses |
| RAIL | Responsible AI licenses |
| OpenAtom Foundation | Model and hardware licenses (bilingual CN/EN) |
| OpenMDW | Permissive license for ML models and related artifacts (Linux Foundation) |
| OSI Review Tracker | 174 OSI license-review submissions, timelines, first/decision dates, board-vote records, and locally archived submitted license texts |

Popularity data comes from HuggingFace Hub (2.8M+ models), GitHub (28 license types), and Kaggle (714K+ datasets via Meta-Kaggle).
The site footer reports the latest data update using the newer timestamp from the license corpus and the OSI review tracker sync, shown inline with the page-view counter.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
