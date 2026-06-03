# LicenseAtlas

A comprehensive license collection website — software, AI model, and data licenses.

## Tech Stack

- Next.js 16 (App Router, static export)
- Tailwind CSS v4
- TypeScript
- Data sourced from KB project

## Commands

- `npm run dev` — local dev server (http://localhost:3000/license.atlas)
- `npm run build` — static export to `out/`
- `npm run lint` — ESLint

## Deployment

- GitHub repo: `morningD/license.atlas`
- GitHub Pages: https://morningd.github.io/license.atlas
- `basePath: "/license.atlas"` configured in `next.config.ts`
- GitHub Actions auto-deploys on push to main (`.github/workflows/deploy.yml`)

## SEO

- `public/robots.txt` — 允许所有爬虫，指向 sitemap.xml
- `public/sitemap.xml` — 由 `scripts/build-sitemap.mjs` 从 `licenses-index.json` 生成（2,589 URLs）
- **数据更新后必须重跑**：`node scripts/build-sitemap.mjs`
- `src/app/layout.tsx` — metadata 含中英 keywords、Open Graph、Twitter Card、JSON-LD 结构化数据
- `src/app/licenses/[slug]/page.tsx` — `generateMetadata` 为每个许可证生成独立 title/description
- Google Search Console 已验证（`public/googlef98d0f412dcfb895.html`），sitemap 已提交

## Data Pipeline

1. KB `scripts/clean-licenses.mjs` reads crawled data → outputs `data/licenses/cleaned/`
   - `licenses.json` — full data with body text (for detail pages, build-time only)
   - `licenses-index.json` — lightweight without body (for homepage, ~0.6MB vs 11MB)
   - `stats.json` — aggregate statistics
2. `cp` cleaned JSON to `license-atlas/src/data/`
3. CC multilingual bodies: extracted to `public/data/cc-bodies/{slug}.json`, lazy-loaded by client

No data processing scripts in this project — KB is the single source of truth.

## i18n

Lightweight client-side i18n via `src/lib/i18n.tsx`:
- `LangProvider` context wraps the app (in `layout.tsx`)
- `useLang()` hook returns `{ lang, setLang, t }`
- `t(key, params)` for string interpolation with `{param}` placeholders
- Auto-detects language: `localStorage("lang")` → `navigator.language.startsWith("zh")` → fallback "en"
- Language toggle in navbar shows "中"/"EN"
- 已翻译范围：navbar/footer 品牌、type/tag/FSF-tag pills、P/C/L 徽章、Blue Oak 评级、语言标签、正文区（Full Text/Copy/Copied/Language）、About 页面、搜索分组

Server components (`licenses/[slug]/page.tsx`) are split into:
- `page.tsx` (server) — data fetching + `generateStaticParams`
- `license-detail-client.tsx` (client) — rendering with `useLang`

## Performance

- Homepage imports `licenses-index.json` (0.6MB) instead of full `licenses.json` (11MB)
- Detail pages are SSG — 11MB JSON only used at build time, users get pre-rendered HTML
- CC multilingual bodies (~500KB) lazy-loaded from `public/data/cc-bodies/` on demand
- Card hover triggers `<link rel="prefetch">` for faster navigation
- Nav progress bar (`nav-progress.tsx`) for page transition feedback

## Design

- Fonts: Geist Sans / Geist Mono (no Inter)
- Primary accent: Violet `#7c3aed`
- OSI brand: `#3DA639`, FSF brand: `#B11107`
- Type badge colors: Software=violet, Model=sky, Data=orange, Agent=purple, Terms=teal
- tl;drLegal Verified badge: gradient `linear-gradient(102deg, #289e6d, #0096e2)`
- Frosted glass card design with hover effect
- Detail page: staggered fade-in entrance animation (`fadeIn` keyframes, 50ms intervals)
- Dark mode via class toggle (localStorage + system preference)
- Visitor counter: busuanzi (dynamically loaded)
- Filter state persisted to URL via `history.replaceState` (no `router.replace` — causes infinite refresh in static export)
- Badge tooltips use opaque Tailwind colors (e.g. `bg-green-50` for OSI, `bg-red-50` for FSF)
- Detail page header has `z-20` so badge tooltips render above Permissions section
- Blue Oak rating section has `relative z-10` so tooltip renders above License Text section
- Homepage tag pills use `border border-transparent` when active (same border width as inactive) to prevent flex-wrap reflow

## Key Components

- `src/lib/i18n.tsx` — LangProvider, useLang hook, en/zh translation dictionary
- `src/components/badge.tsx` — Badge with variants: osi, fsf, type, tag, permission, condition, limitation, verified, language, fsf-tag, blue-oak. `themeKey` prop separates style lookup from display text
- `src/components/license-card.tsx` — Frosted glass card with hover prefetch + sparkline
- `src/components/navbar.tsx` — Nav with language toggle + dark mode toggle + GitHub link
- `src/components/footer.tsx` — Footer with busuanzi counter (dynamic script injection)
- `src/components/nav-progress.tsx` — Top progress bar for page transitions
- `src/components/license-body-section.tsx` — License text renderer with lazy-loaded CC family nav
- `src/components/cc-family-nav.tsx` — Language switcher for CC multilingual bodies
- `src/app/page.tsx` — Homepage with search, filters, license grid (uses licenses-index.json)
- `src/app/about/page.tsx` — About page with sources, stats, links
- `src/app/licenses/[slug]/page.tsx` — Server wrapper (SSG, uses full licenses.json)
- `src/app/licenses/[slug]/license-detail-client.tsx` — Client detail view with i18n
- `.github/ISSUE_TEMPLATE/license-feedback.yml` — GitHub issue 模板（Report Issue 按钮链接到此模板）

## 添加许可证 Checklist

修改 `licenses.json` 后，**必须同步更新以下文件并全部提交**：

1. `src/data/licenses.json` — 完整数据（含 body），详情页用
2. `src/data/licenses-index.json` — 轻量版（无 body），**主页直接 import**，tag pills 从此文件读取
3. `src/data/stats.json` — 重新计算 by_type、by_tag、by_source 等统计
4. `public/search-index.json` — 运行 `node scripts/build-search-index.mjs` 重建
5. `public/sitemap.xml` — 运行 `node scripts/build-sitemap.mjs` 重建
6. `README.md` / `README.zh-CN.md` — 更新总数、数据源表
7. `src/app/about/page.tsx` — 如有新数据源，添加到 sources 列表 + i18n
8. `src/lib/i18n.tsx` — 如有新 tag/描述，添加翻译

**最容易遗漏的是 `licenses-index.json`**：主页 filter pills 的 tags 来自这个文件，而非 `licenses.json`。如果只改后者，线上 pills 不会更新。

## Tag 系统

- Tag 定义：`src/components/badge.tsx` 的 `themes` 对象（颜色、desc、tooltip 样式）
- Tag 排序：`src/app/page.tsx` 的 `tagOrder` 数组
- Tag 翻译：`src/lib/i18n.tsx` 的 `tag.*`（标签名）和 `tagdesc.*`（悬浮描述）
- Badge 组件优先查 i18n key `tagdesc.{key}`（key 为 resolveKey 结果），回退到 themes 里的英文 desc
- 新增 tag 需同时更新：themes（badge.tsx）、tagOrder（page.tsx）、i18n 翻译（zh/en）
- 不随意新增 tag，只有数量足够多（建议 ≥3）才有筛选意义
- `languages` 字段是独立的语言筛选，与 tags 无关

## 暗色模式

- Tailwind v4 class-based dark mode：`@custom-variant dark (&:where(.dark, .dark *))`
- `ThemeToggle` 组件需要在 hydration 后用 `useEffect` 重新应用 `dark` class（否则 React hydration 会覆盖 `<html>` 上的 class）
- 持久化：`localStorage("theme")` + `matchMedia("(prefers-color-scheme: dark)")`

## 常见陷阱

- **静态导出 + CDN 缓存**：GitHub Pages 有 `max-age=600`（10分钟），部署后需等待缓存过期或强制刷新
- **Safari favicon 缓存**：独立于浏览器缓存，存储在 `~/Library/Safari/Favicon Cache/*`，需要完全磁盘访问权限才能清除
- **ICO 格式**：必须是 proper multi-size ICO，不能是重命名的 PNG
- **Badge 翻译 vs 样式分离**：Badge 的 `themeKey` prop 用于查找样式和 tooltip，`children` 用于显示文本。翻译后的中文文本（如 "软件"）在 themes 里没有对应样式，必须传原始英文值（如 "software"）作为 `themeKey`。Blue Oak badge 传 `themeKey={license.blueoak_tier}`（如 "Silver"），children 传翻译文本（如 "银级"）
- **i18n key normalize**：tag 名转 i18n key 时需去掉特殊字符（分号等），用 `tag.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "")`。themes 字典的 key 也必须与 normalize 结果一致（如 `"tldrlegal-verified"` 无分号）
- **Badge tooltip i18n 查找**：使用 `tagdesc.${key}`（key 为 resolveKey 结果），不再用 normalizeKey(themeKey)。Blue Oak 的 tooltip key 为 `tagdesc.bo-silver` 等
- **Hydration mismatch**：客户端语言检测会导致 SSR 内容（英文）与客户端渲染（中文）不匹配。品牌名用 `mounted` state 守卫，其余 `t()` 文本接受 mismatch（不影响功能）

## Blue Oak 评级

Blue Oak Council 对 225+ SPDX 宽松许可证提供质量评级（Model/Gold/Silver/Bronze/Lead）。

### 数据来源

- KB `clean-licenses.mjs` 在构建时自动获取 `https://blueoakcouncil.org/list.json`（~20KB）
- 按 `spdx_id` 匹配，匹配到的许可证添加 `blueoak_tier` 字段
- 合规：Blue Oak ToS 明确允许自动化获取 JSON 数据文件

### 数据模型

- `blueoak_tier?: string` — 可选字段，值为 "Model" / "Gold" / "Silver" / "Bronze" / "Lead"
- 仅 ~225 个 SPDX 许可证有此字段，其余许可证无此字段（不显示评级区域）

### 详情页展示

- 评级区域在 P/C/L 之后、License Text 之前，父容器有 `relative z-10` 确保 tooltip 不被遮挡
- Badge 用 `variant="blue-oak" themeKey={tier}`，`resolveKey` 映射到 `bo-{tier}` 的 theme key
- 每个等级有独立的金属质感配色：Model=紫、Gold=金、Silver=银、Bronze=铜、Lead=铅灰
- Badge 文本通过 `bo.{tier}` i18n key 翻译（Model→模板, Gold→金级, Silver→银级 等）
- Pill 后描述文字通过 `detail.blueOak.{tier}` i18n key 翻译（简练概括版）
- Pill 悬浮窗通过 `tagdesc.bo-{tier}` i18n key 翻译（Blue Oak Council 官方完整描述）

## 中文品牌名

- 英文：`LicenseAtlas`，中文：`许可图鉴`（衬线体 `font-serif`）
- 切换逻辑在 `navbar.tsx`、`footer.tsx`、`page.tsx` 中，通过 `useLang()` 的 `lang` 判断
- 使用 `mounted` state 守卫避免 hydration mismatch（SSR 默认渲染英文）
- About 页标题："关于许可图鉴（LicenseAtlas）"（中英文对照）

## Terms 设计

Terms 是一种特殊的条目类型，用于记录被许可证正文引用的服务条款（Acceptable Use Policy、Terms of Use 等），本身不是独立的许可证。当前共 16 个 Terms 条目，覆盖 Anthropic、Meta/Llama、NVIDIA、xAI、Databricks、Stability AI、EvolutionaryScale、OpenAI、Moonshine AI 等组织。

### 数据模型

- `type: "agent"` — 不新增 type，复用现有类型
- `tags: ["Terms", "Custom", "Proprietary"]` — 通过 "Terms" tag 标识
- `terms?: { name: string; url: string; slug?: string }[]` — 许可证条目上的可选字段，引用相关 Terms 文档
  - `slug` 存在时渲染为站内 `<Link>` 跳转（如 `/licenses/anthropic-consumer-terms`）
  - `slug` 不存在时渲染为外部 `<a>` 链接（带 ↗ 箭头）
- 命名规则：`{Organization} {Type} Terms of Service` 或 `{Organization} {Product} Acceptable Use Policy`

### 详情页展示规则

Terms 条目的详情页与普通许可证不同：

- **Badges 区块**：Terms 条目只显示一个 pill —— "Terms"（teal 色系）。不显示 type badge、OSI/FSF、语言、其他 tag pills。这是显式展示 Terms pill，不是隐藏其他 pill
- **正文标题**：统一用 "Full Text"（非 "License Text"），因为 Terms 不是 license
- **Permissions/Conditions/Limitations**：正常渲染（Terms 条目通常为空数组）
- **Related Terms 区块**：仅在含 `terms` 字段的许可证条目上显示，在 Sources 区块之后，支持站内跳转

### 爬取与清洗

推荐使用 Jina Reader API（`https://r.jina.ai/{url}`）爬取，或 webReader MCP 工具。爬取后必须清洗：

1. 去掉 Jina meta headers（`Title:`、`URL Source:`、`Markdown Content:`）
2. 去掉导航菜单（识别标题/正文起始点，截断之前的菜单内容）
3. 去掉页面 footer（Cookie 政策、公司信息等）
4. 去 markdown 格式（`**`、`__`、`##`、`[](url)`、`![](url)`、`*   ` 列表标记）
5. 清理多余空白行和行尾空格

### 添加 Terms 条目 Checklist

1. 爬取 Terms 页面正文，按上述规则清洗为纯文本
2. 添加到 `licenses.json`：`tags: ["Terms", "Custom", "Proprietary"]`，`proprietary: true`
3. 在引用 Terms 的许可证条目上添加 `terms` 字段（含 `name`、`url`、`slug`）
4. 同步 `licenses-index.json`、`stats.json`、`search-index.json`、README 总数
5. 如爬取失败（404、超时），跳过不创建条目，该许可证的 `terms` 字段也不添加
5. 如有新 tag 需更新：badge.tsx themes、page.tsx tagOrder、i18n.tsx 翻译
