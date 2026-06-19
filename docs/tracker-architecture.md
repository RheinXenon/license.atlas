# OSI License Review Tracker — 集成架构

## 概述

license-atlas 集成 KB 的 OSI License Review Tracker，提供两种入口：

1. **独立入口** `/tracker` — React/Tailwind 完整复刻 KB tracker 全部功能。
2. **详情页内嵌** `LicenseReviewBlock` — 命中 OSI review 的许可证显示摘要 + 压缩 strip，点击跳 `/tracker?focus=<spdx>`。

## 数据流

KB（source of truth）→ license-atlas 单向同步：

- `public/data/tracker.json`（~3.25MB，全量，lazy-load）— cp 自 KB `data/osi/license-review-tracker-v2.json`
- `src/data/tracker-index.json`（~115KB，轻量，build-time）— 供详情页查 spdx→submission 映射

## 更新流程

| 命令 | 作用 |
|---|---|
| `npm run build` | 内嵌 sync（hash 检测，无变化跳过）+ search-index + next build |
| `npm run sync:tracker` | 只同步 tracker（不跑 KB 构建） |
| `npm run update:tracker [--full]` | 全链路：调 KB apply-llm-batches + build + enrich + sync |

**增量检测**：sync-tracker.mjs 用 sha1(submission 数 + enriched_at + id:status:timeline_count 签名) 对比 atlas 现有 index 的 `_meta.source_hash`。不变则跳过（幂等）。

**两种更新场景**：
- KB 先更新 OSI 源 → atlas 下次 `build` 自动识别 hash 变化同步。
- atlas 一条龙 → `update:tracker` 调 KB 重建（默认增量 LLM，`--full` 全量）。

## 组件

- `src/app/tracker/` — `/tracker` 路由（page + client）
- `src/components/tracker/` — tracker-card / timeline-strip / board-vote-card / participants-list / review-detail-tabs
- `src/components/license-review-block.tsx` — 详情页内嵌块

## 设计约束

- 不改 KB 侧文件。状态色纳入 atlas 语义色板（见 `badge.tsx` `review-*` themes）。详见设计文档 `docs/superpowers/specs/2026-06-18-license-review-tracker-integration-design.md`。
- KB 数据构建细节见 `docs/OSI-TRACKER.md`。
