# OSI License Review Tracker 集成设计

- **日期**: 2026-06-18
- **状态**: 设计已获批，待写实施计划
- **作者**: brainstorming 协作产出
- **相关**: KB `data/osi/license-review-tracker-v2.json`（3.25MB，172 submissions）

## 1. 目标

把 KB 项目打磨完成的 OSI License Review Tracker 集成进 license-atlas，提供两种入口：

1. **独立入口** `/tracker` —— React/Tailwind 完整复刻 KB tracker 的全部功能，风格与 license-atlas 统一。
2. **许可证详情页内嵌** —— 在能匹配到 OSI review 的许可证详情页里，展示一个"License Review"区块（摘要 + 压缩 timeline strip），点击跳转 `/tracker?focus=<spdx>` 自动定位展开高亮。

### 非目标

- 不重写 KB 的分类/提取逻辑（`classifyEvent`、`extract-points` 等留 KB 侧，atlas 只消费 `v2.json`）。
- 不改动 KB 侧任何文件（KB 不是 git 仓库，是 source of truth 的数据层）。
- 不做 tracker 数据的版本历史展示（hash 仅用于增量检测，不向用户展示）。

## 2. 背景：数据现状

KB 产出的 `license-review-tracker-v2.json`：

- 172 个 submission：approved 102 / rejected 37 / pending 6 / withdrawn 4 / superseded 3 / legacy 20。
- 119 个有 `spdx_id`，其中 **116 个能匹配到** license-atlas 的 `licenses-index.json`（3 个因大小写/空格未命中：`agpl-3.0`、`cern-ohl-s-2.0 `、`lgpl-3.0`，sync 时 normalize 兜底）。
- `deep_analysis` 字段全空（0 个有），详情页"基本 review 信息"只能用 status / submitter / participants / timeline / board_vote / rejection_reason。
- 62 个有 board_vote，61 个有 license_texts，timeline 事件含 `point_zh`（中英双语）。

license-atlas 现状：Next.js 16 App Router 静态导出（`output: "export"`, `basePath: "/license.atlas"`），Tailwind v4，Geist 字体，accent violet `#7c3aed`，i18n via `useLang()/t()`，数据 `cp` 自 KB。

## 3. 架构

### 3.1 数据流（单向：KB → atlas，KB 始终 source of truth）

```
KB/data/osi/license-review-tracker-v2.json  (3.25MB)
        │
        ├─ sync-tracker.mjs ──────────────► public/data/tracker.json   (cp, 全量)
        │                                   src/data/tracker-index.json (生成, 轻量 ~50KB)
        │
        └─ update-tracker.mjs (编排器) ──► 调 KB build/enrich/apply-llm ──► sync

详情页 (116 个):  import tracker-index.json (build-time, ~50KB)
                  → 查 spdx_id 命中 → 渲染 LicenseReviewBlock

/tracker 独立页:   lazy fetch /data/tracker.json (3.25MB, 客户端)
                  → 读 ?focus=<spdx> → 自动定位展开
```

**双文件设计：**
- `public/data/tracker.json` —— 全量（3.25MB），`/tracker` 客户端 lazy-fetch，不进 JS bundle。对齐现有 `cc-bodies/`（3.5MB）的懒加载模式。
- `src/data/tracker-index.json` —— 轻量映射（~50KB），build-time import，供详情页判断 + 摘要。不含 timeline/snippet 正文。

### 3.2 tracker-index.json 结构

详情页只读这些，不含 timeline 正文（避免 116 条 × N events 让 index 膨胀）：

```jsonc
{
  "_meta": {
    "source_hash": "<sha1>",          // 增量检测用
    "generated_at": "2026-06-18T...",
    "total_submissions": 172,
    "by_status": { "approved": 102, ... }
  },
  "Unlicense": {
    "id": "unlicense",
    "name": "The Unlicense",
    "status": "approved",
    "submitter": "Steffen Jaeckel",
    "stats": { "total_messages": 7, "duration_days": 80, "date_range": ["2020-03-28", "2020-06-16"] },
    "has_vote": true,
    "has_timeline": true,
    "timeline_meta": { "count": 7, "first": "2020-03-28", "last": "2020-06-16" }
  },
  "MIT": { ... }
}
```

**关键约束：详情页内嵌 strip 用压缩版** —— index 里不存完整 timeline。详情页 strip 只画节点序列形状（用 `timeline_meta` + status 派生的关键节点），不画 snippet/tooltip。完整 strip + tooltip 交互留给 `/tracker`。详情页 strip 是"视觉诱饵"（点哪都跳 `/tracker?focus=...`）。

## 4. 更新流程（核心需求：统一入口 + 增量识别）

**原则：license-atlas 的更新流程是唯一入口，它自己负责判断 OSI/tracker 是否需要更新。**

KB 不是 git 仓库，无法靠 git diff 识别增量 → 用**数据指纹（hash）对比**。

### 4.1 三个场景

| 场景 | 操作 | sync 行为 |
|---|---|---|
| A. atlas 侧更新许可证数据 | `npm run build` | sync 内嵌主 build，对比 hash，无变化跳过，有变化同步 |
| B. 先在 KB 单独更新 OSI 源 | 回 atlas `npm run build` | sync 检测 hash 变化 → 自动同步增量（不重跑 KB 构建） |
| C. 想一条龙跑全链路 | `npm run update:tracker [--full]` | 编排器调 KB build/enrich/LLM → 再 sync |

### 4.2 npm 入口（分层）

```jsonc
"scripts": {
  "build": "node scripts/build-search-index.mjs && node scripts/sync-tracker.mjs && next build",
  //        sync 内嵌主 build，每次构建自动检测（幂等，无变化零写入）
  "sync:tracker": "node scripts/sync-tracker.mjs",
  //          手动只同步 tracker（不跑 KB 构建，纯 cp + 生成 index）
  "update:tracker": "node scripts/update-tracker.mjs",
  //            全链路编排器（调 KB build/enrich/LLM + sync）
  //            默认 --incremental；--full 全量重提 LLM
}
```

### 4.3 sync-tracker.mjs 增量检测逻辑

```js
const KB_V2 = "../KB/data/osi/license-review-tracker-v2.json";  // 可 --kb-path 覆盖
const ATLAS_FULL = "public/data/tracker.json";
const ATLAS_INDEX = "src/data/tracker-index.json";

const kbData = read(KB_V2);
const kbHash = sha1(JSON.stringify({
  n: kbData.submissions.length,
  enriched_at: kbData.meta.enriched_at,
  sig: kbData.submissions.map(s => `${s.id}:${s.status}:${(s.timeline||[]).length}`).join("|")
}));

const existingIndex = exists(ATLAS_INDEX) ? read(ATLAS_INDEX) : null;
const atlasHash = existingIndex?._meta?.source_hash;

if (atlasHash === kbHash) {
  console.log("✓ tracker 无变化，跳过同步");
  process.exit(0);   // 幂等
}

cp(KB_V2, ATLAS_FULL);
write(ATLAS_INDEX, buildIndex(kbData, kbHash));   // 含新 source_hash + spdx normalize 兜底
console.log(`✓ 同步 ${kbData.submissions.length} submissions (hash 变化)`);
```

**hash 设计依据：** `enriched_at` 捕获 KB 任何重建；`id:status:timeline_count` 签名捕获内容级变化（即使时间戳没变）。幂等：hash 不变则什么都不做。

### 4.4 update-tracker.mjs 编排器

```bash
npm run update:tracker                       # 安全增量（默认）
npm run update:tracker -- --full             # 全量重提 LLM
npm run update:tracker -- --kb-path /abs/KB  # 覆盖 KB 路径

# 内部：
1. 校验 KB 路径（默认 ../KB）
2. cd KB → node scripts/apply-llm-batches.mjs  (增量：只对 manifest 没有的新 URL 提取)
   [--full 时跳过增量检测，全量重提]
3. cd KB → node scripts/build-license-review-tracker.mjs
4. cd KB → node scripts/enrich-license-tracker.mjs
5. node scripts/sync-tracker.mjs   (cp v2.json + 生成 index)
6. 打印变更摘要（新增 submission 数 / 新增 opinion 数）
```

LLM 提取用**增量 + 显式全量**策略：默认只提取 manifest 没有的新 URL（成本可控），全量重提需 `--full`（避免覆盖手动 cleanup 的覆盖项）。

## 5. 文件清单

### 新增

```
public/data/tracker.json                       ← cp 自 KB v2.json（3.25MB，sync 生成）
src/data/tracker-index.json                    ← 轻量映射（sync 生成，~50KB）
src/app/tracker/page.tsx                       ← 独立入口（server: generateMetadata + 骨架 + 透传 focus）
src/app/tracker/tracker-client.tsx             ← 客户端：lazy-load tracker.json，复刻全部交互
src/components/tracker/tracker-card.tsx        ← 卡片（折叠态 + 展开态）
src/components/tracker/timeline-strip.tsx      ← 时间轴 strip + tooltip（边框响应背景色）
src/components/tracker/board-vote-card.tsx     ← vote（outcome 着色）
src/components/tracker/participants-list.tsx
src/components/tracker/review-detail-tabs.tsx  ← timeline/participants/texts/vote tabs
src/components/license-review-block.tsx        ← 详情页内嵌区块（摘要 + 压缩 strip + 跳转）
scripts/sync-tracker.mjs                       ← 增量同步（cp + index + hash 检测）
scripts/update-tracker.mjs                     ← 全链路编排器
docs/OSI-TRACKER.md                            ← 拷贝 KB 原 TRACKER.md（364 行，保留 KB 侧原件）
docs/tracker-architecture.md                   ← 新写：集成架构 + 同步 + 编排
```

### 改动

```
package.json                ← 加 sync:tracker / update:tracker，build 内嵌 sync
navbar.tsx                  ← 加 Review Tracker 入口
license-detail-client.tsx   ← Blue Oak 区块后插入 <LicenseReviewBlock>
i18n.tsx                    ← 加 tracker.* / review.* 翻译组
badge.tsx                   ← 加 review-status themeKey（status 颜色映射）
build-sitemap.mjs           ← urls 数组加 /tracker
```

## 6. 风格统一

tracker 从 KB 的 Inter 字体 + 自带 CSS，迁移到 atlas 设计系统。**不再有独立调色板**，与 P/C/L、OSI/FSF、type badge 共用一套语义色。

### 6.1 色板映射

| tracker 元素 | KB 原 | atlas 统一映射 |
|---|---|---|
| 主 accent | `#7c3aed` violet | 一致（atlas accent 本就是 violet） |
| 次要 accent | `#06b6d4` cyan | 保留作 timeline/series 次强调 |
| 卡片背景 | `rgba(255,255,255,0.75)` + blur | atlas `.license-card` 磨砂玻璃 |
| 暗色模式 | tracker 自带 `.dark` | 复用 atlas `.dark`（同一套 CSS 变量） |

### 6.2 状态色（纳入 atlas 语义色板，不照搬 KB hex）

| 状态 | KB 原 | atlas 统一映射 |
|---|---|---|
| approved | `#10b981` emerald | OSI 绿 `#3DA639` 系 |
| rejected | `#ef4444` red | FSF/limitations 红 |
| pending | `#8b5cf6` violet | accent violet（"进行中"） |
| withdrawn | `#f59e0b` amber | conditions 黄系 |
| superseded | `#6366f1` indigo | Model sky 系 |
| legacy | `#64748b` zinc | 中性灰 |

sentiment tint 同步统一：positive→emerald、negative→红、question→accent。

### 6.3 组件复用

- **字体**: 全改 Geist（删 Inter `<link>`，`font-family` 走 atlas `--font`）。
- **圆角/间距**: 手写 CSS 变量转 Tailwind `rounded-2xl`/`rounded-xl`，与 license-card 视觉一致。
- **status badge**: 复用 atlas `Badge`，新增 `review-status` themeKey，颜色进 `badge.tsx` themes，i18n 走 `tagdesc.review-*`。
- **搜索框/筛选按钮**: Tailwind 重写（KB inline style 全转 className）。
- **卡片 hover**: 复用 license-card 的 hover（top accent line + translate）。

### 6.4 i18n 全覆盖

- tracker UI 文案（Sort: Recent Activity、Expand details、Participants、Board Vote、Timeline、Discuss、Review、All、Search...）进 `tracker.*` 翻译组。
- timeline snippet：已有 `point_zh` 字段，复用 KB `lang === 'zh' ? point_zh : snippet`，由 atlas `useLang` 直接驱动。

## 7. 交互细节

### 7.1 详情页 → /tracker focus 定位（自动定位+展开+高亮）

```
详情页 strip 点击 → router.push('/tracker?focus=Unlicense')
/tracker page.tsx (server) → 透传 focus 到 client
tracker-client.tsx:
  1. lazy-load tracker.json 完成
  2. 读 searchParams.focus → 找到 submission
  3. expandedIds.add(id) + 自动滚到卡片中央
  4. flashEl 复刻 KB tlFlash 动画（高亮 1.7s）
  5. URL 清掉 focus 参数（避免刷新重复滚动）
```

### 7.2 /tracker 内部交互（全复刻 KB，逻辑直译 React）

search/sort/status filter/stat chips、strip 节点 tooltip（边框响应背景色）、vote outcome 着色（保留 Vaccine 修复）、participants/arguments/license-texts tabs、series filter、Review/Discuss/All 源过滤、暗色模式联动。不重新设计。

### 7.3 LicenseReviewBlock（详情页内嵌）

跟 Blue Oak/Terms 区块同款：磨砂卡片、`relative z-10`（避免遮挡，对齐 CLAUDE.md 层级约定）、标题区 + 摘要行（status/submitter/days/msgs）+ 压缩 strip + "View full review →"。压缩 strip 无 tooltip，点击整块跳 `/tracker?focus=<spdx>`。仅在 tracker-index 命中 spdx 时渲染。

## 8. 验证

1. `npm run dev` 本地预览（不 commit）。
2. 对照 KB standalone.html 逐项点验：随机抽 5 个 submission（approved/rejected/pending/各一），确认 strip/vote/timeline/tooltip 与 KB 版一致。
3. 详情页：确认 116 个命中 spdx 的许可证显示 review 块，未命中的不显示。
4. focus 跳转：从详情页 strip 点 → /tracker 自动展开高亮。
5. 更新流程：`npm run build` 跑两次，第二次确认"无变化跳过"。
6. 暗色/i18n：中英切换、暗色切换，strip sentiment/vote 着色正确。

## 9. 风险/边界

- **3.25MB lazy-load**: `/tracker` 首次加载有体感延迟 → 加骨架屏 + loading 文案。可接受（cc-bodies 同量级）。
- **spdx 不完全匹配**: 3 个（agpl-3.0、cern-ohl-s-2.0、lgpl-3.0）sync 时 normalize 兜底；仍未命中的不显示详情页 review 块，但在 /tracker 正常可见。
- **119 有 spdx vs 116 命中**: 3 个不命中的在 /tracker 可见，详情页无块（预期行为）。

## 10. 不做项

- 不做 tracker 独立搜索索引（复用 tracker.json 内存 filter）。
- 不做 tracker 数据版本历史展示（hash 仅检测用）。
- 不重写 KB 分类逻辑（留 KB 侧）。
- 不动 KB 侧任何文件。
- 详情页不内嵌完整 timeline tooltip（完整交互留给 /tracker）。
