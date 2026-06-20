# OSI License Review Tracker — 集成架构

## 概述

license-atlas 集成 KB 的 OSI License Review Tracker，提供两种入口：

1. **独立入口** `/tracker` — React/Tailwind 完整复刻 KB tracker 全部功能。
2. **详情页内嵌** `LicenseReviewBlock` — 命中 OSI review 的许可证显示摘要 + 压缩 strip，点击跳 `/tracker?focus=<spdx>`。

## 数据流

KB（source of truth）→ license-atlas 单向同步：

- `public/data/tracker.json`（~3.2MB，全量，lazy-load）— cp 自 KB `data/osi/license-review-tracker-v2.json`
- `src/data/tracker-index.json`（轻量，build-time）— 供详情页查 spdx→submission 映射，并包含 `review_dates`（首次提交、批准/否决日期）

## 更新流程

| 命令 | 作用 |
|---|---|
| `npm run build` | 内嵌 sync（hash 检测，无变化跳过）+ search-index + next build |
| `npm run sync:tracker` | 只同步 tracker（不跑 KB 构建） |
| `npm run update:tracker -- --month YYYY-MM` | 全链路：刷新 OSI `license-review`/`license-discuss` 邮件归档 + 重建索引 + 发现 pending + 合并 LLM point + build/enrich + point/text coverage checks + sync |
| `npm run update:tracker -- --since YYYY-MM` | 从指定月份到当前月份增量刷新 |
| `npm run update:tracker -- --skip-mail` | 跳过邮件抓取，只跑已有 KB 数据的 build/enrich/sync |

**增量检测**：`sync-tracker.mjs` 对 KB v2 的稳定 payload 做 hash（忽略 `meta.generated_at` / `meta.enriched_at` 这类纯重建时间戳），并同时检查 `tracker-index.json._meta.index_schema_version`。不变则跳过（幂等）；schema 变化时即使 source hash 不变也会重建 index。

**轻量 index 日期字段**：`tracker-index.json` 写入 `review_dates.first_submitted` / `review_dates.decision` / `review_dates.decision_status`。优先级：首次提交 = OSI API `submission_date` → timeline 首个 `submission` → `stats.date_range[0]`；批准/否决日期 = OSI API `approval_date` → `board_vote.date` → timeline `board_decision.date`。详情页 `LicenseReviewBlock` 显示 `First Submitted` 和 `Approved Date` / `Rejected Date`。

**轻量 index 文本字段**：`tracker-index.json` 写入 `text_meta.count` / `linked_count` / `duplicate_count` / `diff_count` / `series` / `latest_text_date`，供详情页和未来按需加载判断，不在轻量 index 放全文。

**两种更新场景**：
- KB 先更新 OSI 源 → atlas 下次 `build` 自动识别 hash/schema 变化同步。
- atlas 一条龙 → `update:tracker` 调 KB 增量刷新邮件和 tracker 数据后同步。

## 组件

- `src/app/tracker/` — `/tracker` 路由（page + client）
- `src/components/tracker/` — tracker-card / timeline-strip / board-vote-card / participants-list / review-detail-tabs
- `src/components/license-review-block.tsx` — 详情页内嵌块
- `src/components/footer.tsx` — 全站页脚显示最新数据更新时间，取 `src/data/stats.json.updated` 与 `src/data/tracker-index.json._meta.generated_at` 中较新者

## 当前同步快照

- `source_hash`: `c82757b1bc1c0554`
- `index_schema_version`: `4`
- 174 个 submissions：approved 102 / rejected 37 / withdrawn 4 / pending 8 / superseded 3 / legacy 20
- 77 个 `board_vote`：minutes 50 / timeline 3 / osi_api 24
- 50 个含详细票数对象（yes/no/abstain）的 board vote
- 115 个保守抽取的 `license_texts`，其中 83 个可直接回链 timeline event，24 个重复内容标记 `duplicate_of`，34 个同系列相邻版本 diff

## 设计约束

- KB 是 source of truth；Atlas 只同步和展示。状态色纳入 atlas 语义色板（见 `badge.tsx` `review-*` themes）。详见设计文档 `docs/superpowers/specs/2026-06-18-license-review-tracker-integration-design.md`。
- KB 数据构建细节见 `docs/OSI-TRACKER.md`。
- `public/data/tracker.json` 当前包含提交许可证文本正文和 diff hunks。文本来源是本地附件文件、Pipermail plain-text MIME part，以及 `Text of the license:` / `License text:` 等 marker 引出的内联许可证块；中英文条款信号都会评分。整封提交邮件、FAQ、OSD notes、代码附件、diff、签名、转发块和 mailing-list footer 等被过滤。如果后续抓取更多附件导致 gzip 明显增长，应拆为 `public/data/tracker-texts/{submission_id}.json` 按需加载。

## 近期 UI 行为

- `/tracker` 底部右侧有无文字的返回顶部按钮；页面滚动超过一屏后出现，点击平滑回到顶部。
- 左上 LicenseAtlas/Home 导航会清空首页搜索和筛选状态，避免回到首页后保留旧查询。
- Review detail 的 `[source ↗]` 链接使用 `whitespace-nowrap`，不会被截断或单独断开。
- Review detail 的 License Texts tab 显示结构化许可证原文历史：版本列表、series、日期、timeline 编号、提取可信度、重复标记、来源链接和本地正文；若选中版本有同系列上一版，`Diff from previous` 显示 line-level 增删 hunks。Timeline 事件若有关联 `text_ids`，事件行显示 `text` 按钮可切到对应文本；文本详情中的 `timeline #N` 可跳回并高亮原事件。
- ModelGo 在 tracker 中显示为 `ModelGo License Family v2.0`，不是单个 `Attribution` 变体；四个具体变体保留在 aliases 和 License Texts series 中：`MG0` / `MG-BY` / `MG-BY-OS` / `MG-BY-SA`。
- 多个 tracker 卡片可同时展开；展开一个 license 不会折叠其他已展开 license。
- Timeline hover tooltip 的事件类型首字母大写，并在 `Feedback` 后紧跟 sentiment tag（如 `negative`）。
- 详情页内嵌 `LicenseReviewBlock` 显示 `First Submitted` 和最终 `Approved Date` / `Rejected Date`。
