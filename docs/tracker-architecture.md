# OSI License Review Tracker — 集成架构

## 概述

license-atlas 集成 KB 的 OSI License Review Tracker，提供两种入口：

1. **独立入口** `/tracker` — React/Tailwind 完整复刻 KB tracker 全部功能。
2. **详情页内嵌** `LicenseReviewBlock` — 命中 OSI review 的许可证显示摘要 + 压缩 strip，点击跳 `/tracker?focus=<spdx>`。

## 数据流

KB（source of truth）→ license-atlas 单向同步：

- `public/data/tracker.json`（~3.26MB，全量，lazy-load）— cp 自 KB `data/osi/license-review-tracker-v2.json`
- `src/data/tracker-index.json`（~238KB，轻量，build-time）— 供详情页查 spdx→submission 映射

## 更新流程

| 命令 | 作用 |
|---|---|
| `npm run build` | 内嵌 sync（hash 检测，无变化跳过）+ search-index + next build |
| `npm run sync:tracker` | 只同步 tracker（不跑 KB 构建） |
| `npm run update:tracker [--full]` | 全链路：调 KB apply-llm-batches + build + enrich + sync |

**增量检测**：`sync-tracker.mjs` 直接对 KB 的 `license-review-tracker-v2.json` 原始 JSON 做 `sha1(kbRaw).slice(0, 16)`，对比 atlas 现有 index 的 `_meta.source_hash`。不变则跳过（幂等），避免只改 vote/point/source 等字段但 submission 数或 timeline 数未变时漏同步。

**两种更新场景**：
- KB 先更新 OSI 源 → atlas 下次 `build` 自动识别 hash 变化同步。
- atlas 一条龙 → `update:tracker` 调 KB 重建（默认增量 LLM，`--full` 全量）。

## 组件

- `src/app/tracker/` — `/tracker` 路由（page + client）
- `src/components/tracker/` — tracker-card / timeline-strip / board-vote-card / participants-list / review-detail-tabs
- `src/components/license-review-block.tsx` — 详情页内嵌块
- `src/components/footer.tsx` — 全站页脚显示最新数据更新时间，取 `src/data/stats.json.updated` 与 `src/data/tracker-index.json._meta.generated_at` 中较新者

## 当前同步快照

- `source_hash`: `8494e90fb44a1922`
- `generated_at`: `2026-06-19T17:17:20.288Z`
- 172 个 submissions：approved 102 / rejected 37 / withdrawn 4 / pending 6 / superseded 3 / legacy 20
- 77 个 `board_vote`：minutes 50 / timeline 3 / osi_api 24
- 50 个含详细票数对象（yes/no/abstain）的 board vote

## 设计约束

- KB 是 source of truth；Atlas 只同步和展示。状态色纳入 atlas 语义色板（见 `badge.tsx` `review-*` themes）。详见设计文档 `docs/superpowers/specs/2026-06-18-license-review-tracker-integration-design.md`。
- KB 数据构建细节见 `docs/OSI-TRACKER.md`。

## 近期 UI 行为

- `/tracker` 底部右侧有无文字的返回顶部按钮；页面滚动超过一屏后出现，点击平滑回到顶部。
- 左上 LicenseAtlas/Home 导航会清空首页搜索和筛选状态，避免回到首页后保留旧查询。
- Review detail 的 `[source ↗]` 链接使用 `whitespace-nowrap`，不会被截断或单独断开。
- 多个 tracker 卡片可同时展开；展开一个 license 不会折叠其他已展开 license。
