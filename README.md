# LicenseAtlas

English | [中文](README.zh-CN.md)

A comprehensive collection of **938** software, AI model, data, and agent licenses — searchable, filterable, and available in English and Chinese.

**Live site**: [LicenseAtlas](https://morningd.github.io/license.atlas)

## Features

- **Full-text search** — search license name, source, body text, with fuzzy matching (powered by MiniSearch)
- **Category filters** — software, model, data, agent
- **Tag filters** — Permissive, Copyleft, Creative Commons, etc.
- **Popularity & trends** — sparkline charts from HuggingFace, GitHub, and Kaggle data
- **Bilingual UI** — English/Chinese with automatic browser language detection
- **Dark mode** — system preference + manual toggle
- **Static export** — 938 pre-rendered pages, fast loading

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
| HuggingFace Hub | Custom model & dataset licenses |
| GitHub | Agent skill, MCP server, and tool licenses |
| Open Data Commons | 3 data licenses |
| RAIL | Responsible AI licenses |

Popularity data comes from HuggingFace Hub (2.8M+ models), GitHub (28 license types), and Kaggle (714K+ datasets via Meta-Kaggle).

## License

This project is licensed under the [Apache License 2.0](LICENSE).
