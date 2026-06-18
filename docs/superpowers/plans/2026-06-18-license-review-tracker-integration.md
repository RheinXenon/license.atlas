# OSI License Review Tracker 集成 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 KB 的 OSI License Review Tracker 集成进 license-atlas：独立入口 `/tracker`（React 完整复刻）+ 许可证详情页内嵌 review 区块（摘要 + 压缩 strip + 跳转），数据从 KB 单向同步，统一进 atlas 更新流程。

**Architecture:** KB 是 source of truth，产 `license-review-tracker-v2.json`（3.25MB）。atlas 侧 `sync-tracker.mjs` 用 hash 增量检测同步到 `public/data/tracker.json`（lazy-load）+ `src/data/tracker-index.json`（轻量映射，build-time）。详情页读 index 渲染内嵌块；`/tracker` lazy-load 全量复刻 KB 全部交互。`update-tracker.mjs` 编排全链路（调 KB build/enrich/LLM）。

**Tech Stack:** Next.js 16 App Router（静态导出）、Tailwind v4、TypeScript、Geist 字体、`useLang()/t()` i18n。

## Global Constraints

- **不改 KB 侧任何文件**（KB 非 git 仓库，source of truth）。
- KB 默认路径 `../KB`，所有脚本可 `--kb-path` 覆盖。
- 风格统一：状态色纳入 atlas 语义色板（不照搬 KB hex），见 spec §6.2。Geist 字体，磨砂卡片，复用 `Badge`。
- `npm run build` 内嵌 `sync-tracker`（幂等，hash 不变零写入）。
- 详情页 review 块仅在 tracker-index 命中 spdx 时渲染。
- 提交粒度：每个 Task 结束 commit；先不 push、不部署，本地 `npm run dev` 预览。
- 工作目录：`/Users/momo/Documents/workspace/license-atlas`。

---

## File Structure

**新增脚本（KB 同步层，先做，零 UI 依赖）：**
- `scripts/sync-tracker.mjs` — hash 增量检测 + cp v2.json + 生成 tracker-index.json
- `scripts/update-tracker.mjs` — 全链路编排器（调 KB build/enrich/LLM）

**生成数据：**
- `public/data/tracker.json` — sync 产出，全量 3.25MB
- `src/data/tracker-index.json` — sync 产出，轻量 ~50KB

**类型 + 翻译 + Badge（基础设施）：**
- `src/lib/types.ts` — 加 TrackerSubmission / TrackerTimelineEvent 等类型
- `src/lib/i18n.tsx` — 加 `tracker.*` / `review.*` 翻译组
- `src/components/badge.tsx` — 加 `review-status` themeKey

**详情页内嵌块：**
- `src/components/license-review-block.tsx` — 摘要 + 压缩 strip + 跳转
- `src/app/licenses/[slug]/license-detail-client.tsx` — Blue Oak 后插入块

**`/tracker` 独立入口（React 复刻，拆 6 子组件）：**
- `src/app/tracker/page.tsx` — server：generateMetadata + 骨架 + 透传 focus
- `src/app/tracker/tracker-client.tsx` — 客户端：lazy-load + 状态 + 复刻交互
- `src/components/tracker/timeline-strip.tsx` — strip + tooltip（边框响应背景色）
- `src/components/tracker/board-vote-card.tsx` — vote（outcome 着色）
- `src/components/tracker/participants-list.tsx`
- `src/components/tracker/review-detail-tabs.tsx` — tabs
- `src/components/tracker/tracker-card.tsx` — 卡片（折叠/展开）

**集成改动：**
- `package.json` — scripts 加 sync/update，build 内嵌 sync
- `src/components/navbar.tsx` — 加 Review Tracker 入口
- `scripts/build-sitemap.mjs` — urls 加 `/tracker`

**文档：**
- `docs/OSI-TRACKER.md` — 拷贝 KB 原 TRACKER.md
- `docs/tracker-architecture.md` — 集成架构文档
- `CLAUDE.md` — 加 tracker 同步章节
- `README.md` / `README.zh-CN.md` — 总数/入口

---

## Task 1: sync-tracker.mjs（增量同步脚本）

**Files:**
- Create: `scripts/sync-tracker.mjs`
- Create: `public/data/`（目录）
- Generated: `public/data/tracker.json`, `src/data/tracker-index.json`

**Interfaces:**
- Consumes: `../KB/data/osi/license-review-tracker-v2.json`（KB source）
- Produces: `public/data/tracker.json`（v2 原样 cp）、`src/data/tracker-index.json`（含 `_meta.source_hash`）
- CLI: `node scripts/sync-tracker.mjs [--kb-path <path>]`，exit 0 当无变化

- [ ] **Step 1: 写脚本**

创建 `scripts/sync-tracker.mjs`：

```js
// Sync OSI License Review Tracker from KB → license-atlas.
// Hash-gated: no-op when KB v2.json is unchanged (idempotent).
// Run: node scripts/sync-tracker.mjs [--kb-path <path>]
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Resolve KB path: --kb-path flag, else env, else ../KB relative to atlas.
function resolveKbPath() {
  const flagIdx = process.argv.indexOf("--kb-path");
  if (flagIdx !== -1 && process.argv[flagIdx + 1]) return resolve(process.argv[flagIdx + 1]);
  if (process.env.KB_PATH) return resolve(process.env.KB_PATH);
  return resolve(ROOT, "..", "KB");
}
const KB_ROOT = resolveKbPath();
const KB_V2 = resolve(KB_ROOT, "data", "osi", "license-review-tracker-v2.json");

if (!existsSync(KB_V2)) {
  console.error(`✗ KB v2.json not found: ${KB_V2}`);
  console.error("  Pass --kb-path <path> or set KB_PATH env.");
  process.exit(1);
}

const ATLAS_FULL = resolve(ROOT, "public", "data", "tracker.json");
const ATLAS_INDEX = resolve(ROOT, "src", "data", "tracker-index.json");

// ── Compute source hash from KB v2.json ──
const kbRaw = readFileSync(KB_V2, "utf8");
const kbData = JSON.parse(kbRaw);
const hashInput = JSON.stringify({
  n: kbData.submissions.length,
  enriched_at: kbData.meta?.enriched_at || "",
  sig: kbData.submissions
    .map((s) => `${s.id}:${s.status}:${(s.timeline || []).length}`)
    .join("|"),
});
const sourceHash = createHash("sha1").update(hashInput).digest("hex").slice(0, 16);

// ── Idempotency check ──
if (existsSync(ATLAS_INDEX)) {
  try {
    const existing = JSON.parse(readFileSync(ATLAS_INDEX, "utf8"));
    if (existing?._meta?.source_hash === sourceHash) {
      console.log(`✓ tracker 无变化 (hash ${sourceHash})，跳过同步`);
      process.exit(0);
    }
  } catch {
    // index corrupt → regenerate below
  }
}

// ── spdx normalize (lowercase, trimmed) for matching robustness ──
const normSpdx = (s) => (s || "").trim().toLowerCase();

// ── Build lightweight index keyed by normalized spdx_id ──
const index = {
  _meta: {
    source_hash: sourceHash,
    generated_at: kbData.meta?.enriched_at || kbData.meta?.generated_at || "",
    total_submissions: kbData.submissions.length,
    by_status: kbData.meta?.by_status || {},
  },
};

// Also keep an id-keyed list for /tracker lookup by ?focus= (id or spdx).
const byKey = {};
for (const s of kbData.submissions) {
  const tl = s.timeline || [];
  const entry = {
    id: s.id,
    name: s.name,
    spdx_id: s.spdx_id || "",
    status: s.status,
    submitter: s.submitter?.name || "Unknown",
    stats: {
      total_messages: s.stats?.total_messages || 0,
      duration_days: s.stats?.duration_days || 0,
      date_range: s.stats?.date_range || [],
    },
    has_vote: !!s.board_vote,
    has_timeline: tl.length > 0,
    timeline_meta: {
      count: tl.length,
      first: tl.length ? tl[0].date : null,
      last: tl.length ? tl[tl.length - 1].date : null,
    },
  };
  // Key by normalized spdx if present, else by id
  const key = s.spdx_id ? normSpdx(s.spdx_id) : normSpdx(s.id);
  byKey[key] = entry;
  if (s.spdx_id) byKey[normSpdx(s.id)] = entry; // also allow id lookup
}
Object.assign(index, byKey);

// ── Write outputs ──
mkdirSync(dirname(ATLAS_FULL), { recursive: true });
copyFileSync(KB_V2, ATLAS_FULL);
writeFileSync(ATLAS_INDEX, JSON.stringify(index, null, 2));

console.log(`✓ 同步 ${kbData.submissions.length} submissions → public/data/tracker.json + src/data/tracker-index.json`);
console.log(`  source_hash: ${sourceHash}`);
console.log(`  by_status: ${JSON.stringify(kbData.meta?.by_status || {})}`);
```

- [ ] **Step 2: 首次运行**

Run: `cd /Users/momo/Documents/workspace/license-atlas && node scripts/sync-tracker.mjs`
Expected: `✓ 同步 172 submissions ...` + 生成两个文件。

- [ ] **Step 3: 验证幂等（第二次运行跳过）**

Run: `node scripts/sync-tracker.mjs`
Expected: `✓ tracker 无变化 (hash xxxx)，跳过同步`

- [ ] **Step 4: 验证 index 内容**

Run: `node -e "const i=require('./src/data/tracker-index.json'); console.log('keys:', Object.keys(i).length-1); console.log('Unlicense:', JSON.stringify(i.unlicense||i.Unlicense)); console.log('_meta:', JSON.stringify(i._meta))"`
Expected: keys 约 172+，Unlicense entry 含 status/submitter/stats/timeline_meta，_meta 含 source_hash。

- [ ] **Step 5: 验证文件体积**

Run: `ls -la public/data/tracker.json src/data/tracker-index.json`
Expected: tracker.json ≈ 3.2MB，tracker-index.json < 100KB。

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-tracker.mjs public/data/tracker.json src/data/tracker-index.json
git commit -m "feat: add sync-tracker.mjs (hash-gated KB→atlas sync)"
```

---

## Task 2: update-tracker.mjs（全链路编排器）

**Files:**
- Create: `scripts/update-tracker.mjs`

**Interfaces:**
- Consumes: KB scripts `scripts/apply-llm-batches.mjs`, `build-license-review-tracker.mjs`, `enrich-license-tracker.mjs`
- Produces: 调用 Task 1 的 sync-tracker.mjs
- CLI: `node scripts/update-tracker.mjs [--full] [--kb-path <path>]`

- [ ] **Step 1: 写脚本**

创建 `scripts/update-tracker.mjs`：

```js
// Full-chain orchestrator: rebuild tracker in KB (LLM + build + enrich) then sync to atlas.
// Run: node scripts/update-tracker.mjs [--full] [--kb-path <path>]
//   --full        re-extract ALL URLs via LLM (default: incremental, only new URLs)
//   --kb-path     override KB path (default ../KB)
import { existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
import { dirname } from "path";
const ROOT = resolve(__dirname, "..");

const FULL = process.argv.includes("--full");
const flagIdx = process.argv.indexOf("--kb-path");
const KB_ROOT = flagIdx !== -1 && process.argv[flagIdx + 1]
  ? resolve(process.argv[flagIdx + 1])
  : resolve(ROOT, "..", "KB");

if (!existsSync(KB_ROOT)) {
  console.error(`✗ KB not found: ${KB_ROOT}`);
  process.exit(1);
}

function run(cmd, cwd) {
  console.log(`\n▶ ${cmd}  (in ${cwd})`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

console.log(`Orchestrating tracker rebuild in KB: ${KB_ROOT}`);
console.log(`LLM mode: ${FULL ? "FULL (re-extract all)" : "INCREMENTAL (new URLs only)"}`);

// 1. LLM extraction (opinion/sentiment). apply-llm-batches is incremental by default.
run("node scripts/apply-llm-batches.mjs" + (FULL ? "" : ""), KB_ROOT);

// 2. Build base tracker
run("node scripts/build-license-review-tracker.mjs", KB_ROOT);

// 3. Enrich
run("node scripts/enrich-license-tracker.mjs", KB_ROOT);

// 4. Sync to atlas
console.log("\n▶ Syncing to license-atlas...");
run(`node scripts/sync-tracker.mjs --kb-path "${KB_ROOT}"`, ROOT);

console.log("\n✅ Tracker full-chain update complete.");
```

- [ ] **Step 2: 静态校验（不实际跑 LLM）**

Run: `node --check scripts/update-tracker.mjs`
Expected: 无语法错误（仅校验语法，不执行）。

- [ ] **Step 3: Commit**

```bash
git add scripts/update-tracker.mjs
git commit -m "feat: add update-tracker.mjs (full-chain KB orchestrator)"
```

---

## Task 3: package.json 集成 + sitemap

**Files:**
- Modify: `package.json`
- Modify: `scripts/build-sitemap.mjs:17-26`

**Interfaces:**
- Consumes: Task 1 sync-tracker.mjs
- Produces: `npm run build` 自动同步；`npm run sync:tracker` / `npm run update:tracker` 可用；`/tracker` 进 sitemap

- [ ] **Step 1: package.json 加 scripts**

读 `package.json`，把 `"build"` 行改为内嵌 sync，并在 scripts 块加两个入口。最终 scripts 块：

```json
"scripts": {
  "dev": "next dev",
  "build": "node scripts/build-search-index.mjs && node scripts/sync-tracker.mjs && next build",
  "build:search": "node scripts/build-search-index.mjs",
  "sync:tracker": "node scripts/sync-tracker.mjs",
  "update:tracker": "node scripts/update-tracker.mjs",
  "start": "next start",
  "lint": "eslint"
},
```

- [ ] **Step 2: build-sitemap.mjs 加 /tracker**

在 `scripts/build-sitemap.mjs` 的 `urls` 数组里，`/about` 行后加 `/tracker`：

```js
const urls = [
  { loc: `${BASE}/`, changefreq: "weekly", priority: "1.0", lastmod: today },
  { loc: `${BASE}/about`, changefreq: "monthly", priority: "0.8", lastmod: today },
  { loc: `${BASE}/tracker`, changefreq: "weekly", priority: "0.8", lastmod: today },
  ...licenses.map((lic) => ({
```

- [ ] **Step 3: 验证 sitemap 生成**

Run: `node scripts/build-sitemap.mjs && grep -c "tracker" public/sitemap.xml`
Expected: 输出 ≥1。

- [ ] **Step 4: 验证 build 内嵌 sync（应跳过，因 Task 1 已同步）**

Run: `node scripts/sync-tracker.mjs`（模拟 build 里的那步）
Expected: `✓ tracker 无变化 ...，跳过同步`。

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/build-sitemap.mjs public/sitemap.xml
git commit -m "feat: embed sync-tracker in build, add /tracker to sitemap"
```

---

## Task 4: TypeScript 类型 + i18n 翻译 + Badge themeKey

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/i18n.tsx`（en 字典 + zh 字典）
- Modify: `src/components/badge.tsx`（themes 对象加 review-status）

**Interfaces:**
- Consumes: KB v2.json submission/timeline 结构（见 spec §背景）
- Produces: `TrackerSubmission` / `TrackerTimelineEvent` / `TrackerBoardVote` / `TrackerParticipant` 类型；`t("tracker.*")` / `t("review.*")`；`<Badge variant="tag" themeKey="review-status">` 配色

- [ ] **Step 1: types.ts 加 Tracker 类型**

在 `src/lib/types.ts` 末尾追加：

```ts
// ── OSI License Review Tracker types (from KB v2.json) ──
export type TrackerStatus =
  | "approved" | "rejected" | "pending"
  | "withdrawn" | "superseded" | "legacy";

export type TrackerTimelineEventType =
  | "submission" | "revision" | "withdrawal"
  | "board_decision" | "feedback";

export type TrackerSentiment =
  | "positive" | "negative" | "neutral" | "question"
  | "mixed" | "support" | "oppose" | "critical";

export interface TrackerTimelineEvent {
  date: string;
  type: TrackerTimelineEventType;
  subject?: string;
  url?: string;
  sender: string;
  snippet: string;
  point?: string | null;
  point_zh?: string | null;
  sentiment: TrackerSentiment;
  source: "license-review" | "license-discuss";
  position?: string;
  relevance?: "high" | "medium" | "low";
}

export interface TrackerParticipant {
  name: string;
  role: "submitter" | "board_member" | "reviewer" | "participant";
  message_count: number;
  affiliation?: string;
}

export interface TrackerBoardVote {
  date: string;
  motion_by: string;
  motion_text: string;
  second_by: string;
  discussion: string;
  vote: { yes: number; no: number; abstain: number; unanimous?: boolean } | null;
  outcome: "approved" | "rejected" | null;
  source: "minutes" | "timeline" | "osi_api";
  minutes_file: string;
  minutes_url: string;
  source_note?: string;
}

export interface TrackerLicenseText {
  filename: string;
  version: string;
  content_preview: string;
  size: number;
}

export interface TrackerSubmission {
  id: string;
  name: string;
  aliases: string[];
  spdx_id: string;
  status: TrackerStatus;
  submitter: { name: string; org?: string; role?: string };
  participants: TrackerParticipant[];
  license_texts: TrackerLicenseText[];
  timeline: TrackerTimelineEvent[];
  board_vote: TrackerBoardVote | null;
  rejection_reason: string;
  osi_api_data: object | null;
  stats: {
    total_messages: number;
    date_range: string[];
    duration_days: number;
    unique_participants: string[];
  };
}

export interface TrackerData {
  meta: {
    generated_at: string;
    total_submissions: number;
    by_status: Record<string, number>;
    enriched_at?: string;
  };
  submissions: TrackerSubmission[];
}

// Lightweight index (tracker-index.json) entry
export interface TrackerIndexEntry {
  id: string;
  name: string;
  spdx_id: string;
  status: TrackerStatus;
  submitter: string;
  stats: { total_messages: number; duration_days: number; date_range: string[] };
  has_vote: boolean;
  has_timeline: boolean;
  timeline_meta: { count: number; first: string | null; last: string | null };
}

export interface TrackerIndex {
  _meta: { source_hash: string; generated_at: string; total_submissions: number; by_status: Record<string, number> };
  [spdxOrId: string]: TrackerIndexEntry | any;
}
```

- [ ] **Step 2: i18n.tsx 加 en 翻译**

在 `src/lib/i18n.tsx` 的 `en` 字典里（`"nav.about": "About",` 行后）加：

```ts
    "nav.tracker": "Review Tracker",
    "tracker.title": "OSI License Review Tracker",
    "tracker.subtitle": "Every license the OSI board has reviewed — submissions, debates, and votes.",
    "tracker.search": "Search license, sender...",
    "tracker.sortRecent": "Sort: Recent Activity",
    "tracker.sortStatus": "Sort: Status",
    "tracker.sortNewest": "Newest Submitted",
    "tracker.sortOldest": "Oldest First",
    "tracker.sortMostDiscussed": "Most Discussed",
    "tracker.sortLongest": "Longest Review",
    "tracker.sortName": "Name A-Z",
    "tracker.expand": "▼ Expand details",
    "tracker.collapse": "▲ Collapse",
    "tracker.tabTimeline": "Timeline",
    "tracker.tabParticipants": "Participants",
    "tracker.tabArguments": "Arguments",
    "tracker.tabTexts": "License Texts",
    "tracker.tabVote": "Board Vote",
    "tracker.all": "All",
    "tracker.review": "Review",
    "tracker.discuss": "Discuss",
    "tracker.events": "Events",
    "tracker.noResults": "No matching submissions found.",
    "tracker.loading": "Loading review tracker...",
    "tracker.days": "days",
    "tracker.messages": "messages",
    "tracker.participants": "participants",
    "tracker.viewFull": "View full review →",
    "tracker.voteApproved": "APPROVED",
    "tracker.voteRejected": "REJECTED",
    "tracker.voteHeader": "Board Vote",
    "tracker.motion": "Motion",
    "tracker.second": "Second",
    "tracker.minutes": "Board Meeting Minutes",
    "review.title": "License Review (OSI)",
    "review.subtitle": "This license went through the OSI board review process.",
```

- [ ] **Step 3: i18n.tsx 加 zh 翻译**

在 `zh` 字典里（`"nav.about": "关于",` 行后）加对应中文：

```ts
    "nav.tracker": "审查追踪器",
    "tracker.title": "OSI 许可证审查追踪器",
    "tracker.subtitle": "OSI 董事会审查过的每一个许可证 —— 提交、辩论与投票。",
    "tracker.search": "搜索许可证、发件人...",
    "tracker.sortRecent": "排序：最近活动",
    "tracker.sortStatus": "排序：状态",
    "tracker.sortNewest": "最新提交",
    "tracker.sortOldest": "最早提交",
    "tracker.sortMostDiscussed": "讨论最多",
    "tracker.sortLongest": "审查最长",
    "tracker.sortName": "名称 A-Z",
    "tracker.expand": "▼ 展开详情",
    "tracker.collapse": "▲ 收起",
    "tracker.tabTimeline": "时间轴",
    "tracker.tabParticipants": "参与者",
    "tracker.tabArguments": "论点",
    "tracker.tabTexts": "许可证文本",
    "tracker.tabVote": "董事会投票",
    "tracker.all": "全部",
    "tracker.review": "Review",
    "tracker.discuss": "Discuss",
    "tracker.events": "事件",
    "tracker.noResults": "未找到匹配的提交。",
    "tracker.loading": "正在加载审查追踪器...",
    "tracker.days": "天",
    "tracker.messages": "条消息",
    "tracker.participants": "位参与者",
    "tracker.viewFull": "查看完整审查 →",
    "tracker.voteApproved": "已批准",
    "tracker.voteRejected": "已否决",
    "tracker.voteHeader": "董事会投票",
    "tracker.motion": "动议人",
    "tracker.second": "附议人",
    "tracker.minutes": "董事会会议纪要",
    "review.title": "许可证审查 (OSI)",
    "review.subtitle": "该许可证经过了 OSI 董事会审查流程。",
```

- [ ] **Step 4: badge.tsx 加 review-status themes**

在 `src/components/badge.tsx` 的 `themes` 对象里（`osi: {` 前或合适位置）加 6 个状态 themeKey。状态色用 atlas 语义色（spec §6.2）：

```ts
  "review-approved": {
    label: "approved",
    className: "border-transparent bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    tooltip: { className: "bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100" },
    desc: "OSI board approved this license.",
  },
  "review-rejected": {
    label: "rejected",
    className: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    tooltip: { className: "bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100" },
    desc: "OSI board rejected this license.",
  },
  "review-pending": {
    label: "pending",
    className: "border-transparent bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    tooltip: { className: "bg-violet-50 text-violet-800 dark:bg-violet-900 dark:text-violet-100" },
    desc: "Under review.",
  },
  "review-withdrawn": {
    label: "withdrawn",
    className: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    tooltip: { className: "bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-100" },
    desc: "Submitter withdrew this license.",
  },
  "review-superseded": {
    label: "superseded",
    className: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    tooltip: { className: "bg-sky-50 text-sky-800 dark:bg-sky-900 dark:text-sky-100" },
    desc: "Replaced by a later version.",
  },
  "review-legacy": {
    label: "legacy",
    className: "border-transparent bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300",
    tooltip: { className: "bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" },
    desc: "Pre-review-era license (board resolution, no public thread).",
  },
```

- [ ] **Step 5: lint 校验**

Run: `npm run lint 2>&1 | tail -20`
Expected: 无新增 error（既有 warning 忽略）。

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/i18n.tsx src/components/badge.tsx
git commit -m "feat: add Tracker types, i18n keys, review-status badge themes"
```

---

## Task 5: LicenseReviewBlock（详情页内嵌块）

**Files:**
- Create: `src/components/license-review-block.tsx`
- Modify: `src/app/licenses/[slug]/license-detail-client.tsx:153`（Blue Oak 区块后插入）

**Interfaces:**
- Consumes: `src/data/tracker-index.json`（build-time import）、`useLang()`、`Badge`
- Produces: `<LicenseReviewBlock spdxId={license.spdx_id} />`，命中时渲染摘要+压缩 strip+跳转

- [ ] **Step 1: 写组件**

创建 `src/components/license-review-block.tsx`：

```tsx
"use client";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/badge";
import { useRouter } from "next/navigation";
import trackerIndex from "@/data/tracker-index.json";

const normSpdx = (s: string) => (s || "").trim().toLowerCase();

export function LicenseReviewBlock({ spdxId }: { spdxId: string }) {
  const { lang, t } = useLang();
  const router = useRouter();

  if (!spdxId) return null;
  const key = normSpdx(spdxId);
  const entry = (trackerIndex as Record<string, any>)[key];
  if (!entry) return null; // not reviewed by OSI

  const { status, submitter, stats, has_timeline, has_vote } = entry;
  const days = stats?.duration_days || 0;
  const msgs = stats?.total_messages || 0;

  // Compressed strip: a visual tease of the timeline shape.
  // Derive node count from timeline_meta.count (capped for layout).
  const tlMeta = entry.timeline_meta || {};
  const nodeCount = Math.min(tlMeta.count || 0, 24);

  function viewFull() {
    router.push(`/tracker?focus=${encodeURIComponent(key)}`);
  }

  return (
    <section className="relative z-10 mt-6 rounded-2xl border border-zinc-200/60 bg-white/60 p-5 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t("review.title")}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("review.subtitle")}</p>
        </div>
        <Badge variant="tag" themeKey={`review-${status}`}>{status}</Badge>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
        <span>👤 {submitter}</span>
        {days > 0 && <span>📅 {days} {t("tracker.days")}</span>}
        {msgs > 0 && <span>💬 {msgs} {t("tracker.messages")}</span>}
        {has_vote && <span>🗳️ {t("tracker.tabVote")}</span>}
      </div>

      {has_timeline && nodeCount > 0 && (
        <button
          onClick={viewFull}
          className="group flex w-full flex-wrap items-center gap-1 rounded-lg bg-violet-50/50 p-2 dark:bg-violet-900/10"
          aria-label={t("tracker.viewFull")}
        >
          {Array.from({ length: nodeCount }).map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-sm bg-violet-300 transition-transform group-hover:scale-110 dark:bg-violet-400/60"
              style={{ opacity: 0.4 + 0.6 * (i / Math.max(1, nodeCount - 1)) }}
            />
          ))}
          {tlMeta.count > 24 && (
            <span className="ml-1 text-xs text-zinc-400">+{tlMeta.count - 24}</span>
          )}
        </button>
      )}

      <button
        onClick={viewFull}
        className="mt-3 text-sm font-medium text-[#7c3aed] transition-colors hover:text-[#6d28d9] dark:text-[#a78bfa]"
      >
        {t("tracker.viewFull")}
      </button>
    </section>
  );
}
```

- [ ] **Step 2: 详情页插入块**

在 `src/app/licenses/[slug]/license-detail-client.tsx` 的 Blue Oak 区块（约 153 行 `{license.blueoak_tier && (...)}` 的闭合 `)}`）之后、`{/* Sources */}`（约 174 行）之前插入：

```tsx
      {/* OSI License Review (only for licenses reviewed by OSI) */}
      <LicenseReviewBlock spdxId={license.spdx_id} />
```

并在该文件顶部 import 区加：

```tsx
import { LicenseReviewBlock } from "@/components/license-review-block";
```

注意：Terms 条目（`type === "terms"`）本身无 spdx_id，块自然不渲染，无需额外守卫。

- [ ] **Step 3: dev 验证命中页**

Run: `npm run dev`（后台），浏览器开 `http://localhost:3000/license.atlas/licenses/unlicense`。
Expected: Blue Oak 区块下方出现 License Review 区块，显示 approved badge + submitter + days + 压缩 strip + "View full review →"。

- [ ] **Step 4: dev 验证未命中页**

浏览器开 `http://localhost:3000/license.atlas/licenses/mit`（MIT 在 tracker 是 legacy 但 v2 里 status=legacy 且 timeline 空，index 里仍有 entry 但 has_timeline=false）。
Expected: 区块渲染（status=legacy），无压缩 strip（has_timeline=false），仍有"View full review"。
另开一个确定无 OSI 审查的 license（如某 proprietary terms 页）确认不渲染块。

- [ ] **Step 5: Commit**

```bash
git add src/components/license-review-block.tsx src/app/licenses/\[slug\]/license-detail-client.tsx
git commit -m "feat: add LicenseReviewBlock on detail pages (summary + strip teaser)"
```

---

## Task 6: navbar 入口

**Files:**
- Modify: `src/components/navbar.tsx:80-88`（About link 后加 Tracker link）

**Interfaces:**
- Consumes: `t("nav.tracker")`

- [ ] **Step 1: 加 nav link**

在 `src/components/navbar.tsx` 的 `<Link href="/about" ...>` 块之后加：

```tsx
          <Link
            href="/tracker"
            className="text-zinc-600 transition-colors hover:text-[#7c3aed] dark:text-zinc-400 dark:hover:text-[#a78bfa]"
          >
            {t("nav.tracker")}
          </Link>
```

- [ ] **Step 2: dev 验证**

Run: `npm run dev`，确认 navbar 出现"Review Tracker"/"审查追踪器"，点击跳 `/tracker`（此时路由还没建，会 404，Task 7-8 补）。

- [ ] **Step 3: Commit**

```bash
git add src/components/navbar.tsx
git commit -m "feat: add Review Tracker link to navbar"
```

---

## Task 7: /tracker 页面骨架 + lazy-load + focus 透传

**Files:**
- Create: `src/app/tracker/page.tsx`
- Create: `src/app/tracker/tracker-client.tsx`（本任务只做骨架 + 数据加载 + focus，渲染逻辑 Task 8-10 填充）

**Interfaces:**
- Consumes: `public/data/tracker.json`（lazy fetch）、`useLang()`、searchParams.focus
- Produces: `/tracker` 路由（SSG，generateStaticParams 无参数）；`TrackerData` 类型加载

- [ ] **Step 1: page.tsx（server）**

创建 `src/app/tracker/page.tsx`：

```tsx
import { Metadata } from "next";
import { Suspense } from "react";
import { TrackerClient } from "./tracker-client";

export const metadata: Metadata = {
  title: "OSI License Review Tracker — LicenseAtlas",
  description:
    "Every license the OSI board has reviewed: submissions, debates, sentiment, and board votes.",
};

// useSearchParams requires a Suspense boundary under static export (output: "export").
export default function TrackerPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">Loading...</div>}>
      <TrackerClient />
    </Suspense>
  );
}
```

- [ ] **Step 2: tracker-client.tsx 骨架 + 加载 + focus**

创建 `src/app/tracker/tracker-client.tsx`（先放数据加载与 loading/focus 占位，渲染在 Task 8 补）：

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import type { TrackerData, TrackerSubmission } from "@/lib/types";

export function TrackerClient() {
  const { lang, t } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<TrackerData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const focusRef = useRef<string | null>(null);

  // Lazy-load full tracker.json (3.25MB) on client.
  useEffect(() => {
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/data/tracker.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: TrackerData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus handling: expand + scroll + flash when ?focus=<spdx|id> present.
  const focusKey = searchParams.get("focus");
  focusRef.current = focusKey;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data || !focusKey) return;
    const norm = (s: string) => s.trim().toLowerCase();
    const sub = data.submissions.find(
      (s) => norm(s.spdx_id) === norm(focusKey) || norm(s.id) === norm(focusKey)
    );
    if (!sub) return;
    setExpandedIds((prev) => new Set(prev).add(sub.id));
    // scroll + flash after render
    requestAnimationFrame(() => {
      const el = document.getElementById(`card-${sub.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("tracker-flash");
        void el.offsetWidth;
        el.classList.add("tracker-flash");
        setTimeout(() => el.classList.remove("tracker-flash"), 1700);
      }
    });
    // clear focus param to avoid re-scroll on refresh
    router.replace("/tracker");
  }, [data, focusKey, router]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">
        Failed to load tracker data.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">
        {t("tracker.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Task 8 fills in search/sort/filter + card list */}
      <p className="text-sm text-zinc-400">[tracker UI — filled in Task 8]</p>
      <pre className="mt-4 text-xs text-zinc-400">
        {`loaded ${data.submissions.length} submissions`}
      </pre>
    </div>
  );
}
```

- [ ] **Step 3: 全局 CSS 加 flash + strip/tooltip 样式**

在 `src/app/globals.css` 末尾加（包含 flash 动画 + timeline-strip 的 `.tl-node`/`.tl-arrow`/`.tl-tip` 样式，避免每个卡片组件注入 `<style>`）：

```css
/* OSI tracker timeline strip + tooltip */
@keyframes trackerFlash {
  0% { background: rgba(124, 58, 237, 0.28); }
  100% { background: transparent; }
}
.tracker-flash { animation: trackerFlash 1.7s ease; }
.timeline-strip .tl-node { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;
  border-radius: 4px; background: rgba(124,58,237,0.06); font-size: 12px; cursor: pointer; margin-right: 2px; }
.timeline-strip .tl-node.submission { background: rgba(16,185,129,0.1); }
.timeline-strip .tl-node.revision { background: rgba(2,132,199,0.1); }
.timeline-strip .tl-node.board_decision { background: rgba(16,185,129,0.15); }
.timeline-strip .tl-node.withdrawal { background: rgba(217,119,6,0.15); }
.timeline-strip .tl-node.sent-positive { background: rgba(16,185,129,0.18); }
.timeline-strip .tl-node.sent-negative { background: rgba(239,68,68,0.18); }
.timeline-strip .tl-node.sent-question { background: rgba(139,92,246,0.18); }
.timeline-strip .tl-node.tl-submitter { box-shadow: inset 3px 0 0 #6d28d9; font-weight: 600; }
.timeline-strip .tl-arrow { color: #94a3b8; font-size: 10px; margin: 0 1px; }
.timeline-strip .tl-arrow.tl-cross-year { color: #7c3aed; font-weight: 700; }
.tl-tip { background: rgba(255,255,255,0.9); border: 1px solid; border-radius: 10px;
  padding: 10px 12px; font-size: 12px; backdrop-filter: blur(12px);
  box-shadow: 0 8px 40px rgba(124,58,237,0.08); }
.dark .tl-tip { background: rgba(30,41,59,0.9); }
.dark .tl-tip .tt-snip { color: #94a3b8; }
.tl-tip .tt-snip { max-height: 50vh; overflow-y: auto; }
```

（Task 8 Step 1 的 timeline-strip 组件**不要**再内联 `<style>`，样式全走这份全局 CSS。）

- [ ] **Step 4: dev 验证加载**

Run: `npm run dev`，开 `http://localhost:3000/license.atlas/tracker`。
Expected: 先显示"Loading..."，加载后显示 `[tracker UI]` + `loaded 172 submissions`。

- [ ] **Step 5: dev 验证 focus**

开 `http://localhost:3000/license.atlas/tracker?focus=unlicense`。
Expected: 加载后 URL 自动变回 `/tracker`，控制台无报错（卡片 DOM 还没建，scroll 静默失败，Task 8 卡片就绪后生效）。

- [ ] **Step 6: Commit**

```bash
git add src/app/tracker/page.tsx src/app/tracker/tracker-client.tsx src/app/globals.css
git commit -m "feat: /tracker page skeleton with lazy-load + focus param"
```

---

## Task 8: search/sort/filter 状态 + 卡片列表渲染

**Files:**
- Modify: `src/app/tracker/tracker-client.tsx`（替换 Task 7 的占位渲染）
- Create: `src/components/tracker/tracker-card.tsx`
- Create: `src/components/tracker/timeline-strip.tsx`
- Create: `src/components/tracker/board-vote-card.tsx`
- Create: `src/components/tracker/participants-list.tsx`
- Create: `src/components/tracker/review-detail-tabs.tsx`

**Interfaces:**
- Consumes: `TrackerSubmission`，Task 7 的 `expandedIds`/`setExpandedIds`、`data`、`lang`
- Produces: 完整 search/sort/status filter + 卡片网格（折叠/展开 + tabs）

- [ ] **Step 1: timeline-strip.tsx（strip + tooltip，边框响应背景色）**

创建 `src/components/tracker/timeline-strip.tsx`。逻辑直译 KB html 的 strip 渲染（`renderCard` 里 `strip` map + tooltip 的 `mouseover`）。边框用 `stripeColor`（sentiment 色 or type 色），与 KB 上次修复一致：

```tsx
"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { TrackerTimelineEvent, TrackerBoardVote } from "@/lib/types";

// Sentiment → parent tint color (mirrors KB SENT_TINT + SENT_COLOR).
const SENT_TINT: Record<string, string> = {
  positive: "positive", support: "positive",
  negative: "negative", oppose: "negative", critical: "negative",
  question: "question", mixed: "mixed", neutral: "neutral",
};
const SENT_HEX: Record<string, string> = {
  positive: "#10b981", negative: "#ef4444", question: "#8b5cf6",
};
const TYPE_COLOR: Record<string, string> = {
  board_decision: "var(--c-approved, #3DA639)",
  withdrawal: "var(--c-withdrawn, #d97706)",
  revision: "var(--c-superseded, #0284c7)",
  submission: "var(--c-approved, #3DA639)",
  feedback: "var(--c-legacy, #71717a)",
};

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface TipState {
  x: number; y: number;
  type: string; typeColor: string; stripeColor: string;
  date: string; sender: string; snip: string;
  submitter?: boolean; board?: boolean; sentiment?: string;
}

export function TimelineStrip({
  timeline, submitter, vote, onNodeClick,
}: {
  timeline: TrackerTimelineEvent[];
  submitter: string;
  vote: TrackerBoardVote | null;
  onNodeClick?: (tab: string, idx: number) => void;
}) {
  const { lang } = useLang();
  const [tip, setTip] = useState<TipState | null>(null);

  const nodes = timeline.map((ev, i) => {
    const d = ev.date ? ev.date.slice(5, 10) : "?";
    const rawType = ev.type || "feedback";
    const label = rawType === "board_decision" ? "✓" : rawType === "withdrawal" ? "✗" : "";
    const typeLabel = rawType.replace(/_/g, " ");
    const colorKey =
      rawType === "board_decision" ? "board_decision"
      : rawType === "withdrawal" ? "withdrawal"
      : rawType === "revision" ? "revision"
      : rawType === "submission" ? "submission" : "feedback";
    const typeColor = TYPE_COLOR[colorKey];
    const sentiment = rawType === "feedback" && ev.sentiment ? ev.sentiment.toLowerCase() : "";
    const tint = SENT_TINT[sentiment] || "neutral";
    const sentClass = tint && tint !== "neutral" ? ` sent-${tint}` : "";
    const nodeHex = tint && tint !== "neutral" ? SENT_HEX[tint] : typeColor;
    const snip = (lang === "zh" ? ev.point_zh || ev.snippet : ev.snippet) || ev.subject || "";
    const isSubmitter = !!(submitter && ev.sender && ev.sender !== "Unknown" && ev.sender === submitter);
    const isLast = i >= timeline.length - 1;
    const crossesYear = !isLast && ev.date && timeline[i + 1].date &&
      ev.date.slice(0, 4) !== timeline[i + 1].date!.slice(0, 4);

    return (
      <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
        <span
          className={`tl-node ${rawType}${sentClass}${isSubmitter ? " tl-submitter" : ""}`}
          onMouseEnter={(e) => setTip({
            x: e.clientX, y: e.clientY,
            type: typeLabel, typeColor, stripeColor: nodeHex,
            date: ev.date || "?",
            sender: ev.sender && ev.sender !== "Unknown" ? ev.sender : "",
            snip, submitter: isSubmitter, sentiment,
          })}
          onMouseMove={(e) => tip && setTip({ ...tip, x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setTip(null)}
          onClick={(e) => { e.stopPropagation(); onNodeClick?.("timeline", i); }}
        >
          {d}{label ? " " + label : ""}
        </span>
        {!isLast && (
          <span className={`tl-arrow${crossesYear ? " tl-cross-year" : ""}`}>
            {crossesYear ? "⇒" : "→"}
          </span>
        )}
      </span>
    );
  });

  return (
    <div className="timeline-strip">
      {nodes}
      {tip && (
        <div
          className="tl-tip show"
          style={{
            position: "fixed", left: tip.x + 14, top: tip.y + 14,
            borderColor: tip.stripeColor, zIndex: 9999,
            maxWidth: 340, pointerEvents: "none",
          }}
        >
          <div className="tt-head" style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="tt-type" style={{ color: tip.typeColor }}>
              {tip.type}
            </span>
            <span className="tt-date" style={{ color: "#94a3b8" }}>{tip.date}</span>
          </div>
          {tip.sender && <div className="tt-sender" style={{ fontWeight: 600 }}>👤 {tip.sender}</div>}
          <div className="tt-snip" style={{ color: "#64748b", whiteSpace: "pre-wrap" }}>{tip.snip}</div>
        </div>
      )}
    </div>
  );
}
```

注：strip 的 `.tl-node`/`.tl-arrow`/`.tl-tip` 样式放在全局 CSS（Task 7 Step 3 已加 `.tracker-flash`，在此处一并补），避免每张卡片重复注入 `<style>`。Task 7 Step 3 的 globals.css 追加块改为：

```css
/* OSI tracker timeline strip + tooltip */
@keyframes trackerFlash {
  0% { background: rgba(124, 58, 237, 0.28); }
  100% { background: transparent; }
}
.tracker-flash { animation: trackerFlash 1.7s ease; }
.timeline-strip .tl-node { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;
  border-radius: 4px; background: rgba(124,58,237,0.06); font-size: 12px; cursor: pointer; margin-right: 2px; }
.timeline-strip .tl-node.submission { background: rgba(16,185,129,0.1); }
.timeline-strip .tl-node.revision { background: rgba(2,132,199,0.1); }
.timeline-strip .tl-node.board_decision { background: rgba(16,185,129,0.15); }
.timeline-strip .tl-node.withdrawal { background: rgba(217,119,6,0.15); }
.timeline-strip .tl-node.sent-positive { background: rgba(16,185,129,0.18); }
.timeline-strip .tl-node.sent-negative { background: rgba(239,68,68,0.18); }
.timeline-strip .tl-node.sent-question { background: rgba(139,92,246,0.18); }
.timeline-strip .tl-node.tl-submitter { box-shadow: inset 3px 0 0 #6d28d9; font-weight: 600; }
.timeline-strip .tl-arrow { color: #94a3b8; font-size: 10px; margin: 0 1px; }
.timeline-strip .tl-arrow.tl-cross-year { color: #7c3aed; font-weight: 700; }
.tl-tip { background: rgba(255,255,255,0.9); border: 1px solid; border-radius: 10px;
  padding: 10px 12px; font-size: 12px; backdrop-filter: blur(12px);
  box-shadow: 0 8px 40px rgba(124,58,237,0.08); }
.dark .tl-tip { background: rgba(30,41,59,0.9); }
.dark .tl-tip .tt-snip { color: #94a3b8; }
.tl-tip .tt-snip { max-height: 50vh; overflow-y: auto; }
```

- [ ] **Step 2: board-vote-card.tsx（outcome 着色）**

创建 `src/components/tracker/board-vote-card.tsx`。直译 KB `renderVote` + outcome badge（保留 Vaccine 修复）：

```tsx
"use client";

import { useLang } from "@/lib/i18n";
import type { TrackerBoardVote, TrackerStatus } from "@/lib/types";

export function BoardVoteCard({ v, status }: { v: TrackerBoardVote; status: TrackerStatus }) {
  const { t } = useLang();
  const oc = v.outcome;
  const ocLabel = oc === "rejected" ? t("tracker.voteRejected") : oc === "approved" ? t("tracker.voteApproved") : "";
  const ocCls = oc === "rejected"
    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
    : oc === "approved"
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "";
  const motionLc = (v.motion_text || "").toLowerCase();
  const withhold = /\b(withholds?\s+(?:its\s+)?approval|did\s+not\s+approve|do\s+not\s+approve|decline|reject)\b/.test(motionLc);
  const tallyNote = oc === "rejected" && withhold && v.vote && v.vote.yes > (v.vote.no || 0)
    ? <div className="my-2 rounded-lg border-l-[3px] border-red-500 bg-red-50 p-3 text-sm dark:bg-red-900/10">
        ⚠️ The {v.vote.yes}-{v.vote.no || 0} vote means the board AGREED to withhold approval — this is a <strong>rejection</strong>, not approval.
      </div>
    : null;

  return (
    <div className="mt-3 rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-50/40 to-cyan-50/40 p-4 dark:border-violet-800/40 dark:from-violet-900/10 dark:to-cyan-900/10">
      <div className="mb-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
        🗳️ {t("tracker.voteHeader")} — {v.date || "?"}
        {ocLabel && <span className={`ml-2 rounded px-2 py-0.5 text-xs font-bold ${ocCls}`}>{ocLabel}</span>}
      </div>
      <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-300">
        <strong>{t("tracker.motion")}:</strong> {v.motion_by || "—"}<br />
        <strong>{t("tracker.second")}:</strong> {v.second_by || "—"}
      </div>
      {v.motion_text && <div className="my-2 text-sm text-zinc-500 dark:text-zinc-400">{v.motion_text}</div>}
      {tallyNote}
      {v.vote && (
        <div className="flex gap-4 text-sm font-semibold">
          <span className="text-green-600 dark:text-green-400">✓ {v.vote.yes} Yes</span>
          <span className="text-red-600 dark:text-red-400">✗ {v.vote.no} No</span>
          <span className="text-zinc-400">○ {v.vote.abstain} Abstain</span>
        </div>
      )}
      {v.minutes_url && (
        <div className="mt-2 text-xs">
          <a href={v.minutes_url} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:underline dark:text-[#a78bfa]">
            {t("tracker.minutes")} ↗
          </a>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: participants-list.tsx**

创建 `src/components/tracker/participants-list.tsx`：

```tsx
"use client";

import type { TrackerParticipant } from "@/lib/types";

const ROLE_CLASS: Record<string, string> = {
  submitter: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "board-member": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  reviewer: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  participant: "bg-zinc-50 text-zinc-400 dark:bg-zinc-800/60",
};

export function ParticipantsList({ participants }: { participants: TrackerParticipant[] }) {
  if (!participants.length) return <div className="text-sm text-zinc-400">No participants identified.</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {participants.map((p, i) => {
        const roleKey = (p.role || "participant").replace(/[_\s]+/g, "-").toLowerCase();
        return (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-white/60 px-2.5 py-1 text-xs dark:border-zinc-700/60 dark:bg-zinc-900/40">
            {p.name}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_CLASS[roleKey] || ROLE_CLASS.participant}`}>{p.role}</span>
            <span className="text-zinc-400">{p.message_count}</span>
          </span>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: review-detail-tabs.tsx**

创建 `src/components/tracker/review-detail-tabs.tsx`。tabs：timeline（按 source 过滤）/ participants / texts / vote：

```tsx
"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { TrackerSubmission } from "@/lib/types";
import { ParticipantsList } from "./participants-list";
import { BoardVoteCard } from "./board-vote-card";

export function ReviewDetailTabs({ s }: { s: TrackerSubmission }) {
  const { lang, t } = useLang();
  const timeline = s.timeline || [];
  const discussCount = timeline.filter((e) => e.source === "license-discuss").length;
  const reviewCount = timeline.length - discussCount;
  const defaultSrc = reviewCount === 0 ? "discuss" : "review";
  const [src, setSrc] = useState<"review" | "discuss" | "all">(defaultSrc);
  const [tab, setTab] = useState<"timeline" | "participants" | "texts" | "vote">("timeline");

  const hasVote = !!s.board_vote;
  const texts = s.license_texts || [];

  const filtered = timeline.filter((e) =>
    src === "all" ? true : src === "discuss" ? e.source === "license-discuss" : e.source !== "license-discuss"
  );

  return (
    <div className="mt-4 border-t border-zinc-200/60 pt-4 dark:border-zinc-800/60">
      <div className="mb-4 flex gap-1 border-b border-zinc-200/60 dark:border-zinc-800/60">
        {([
          ["timeline", `${t("tracker.tabTimeline")} (${timeline.length})`],
          ["participants", `${t("tracker.tabParticipants")} (${s.participants.length})`],
          ...(texts.length ? [["texts", `${t("tracker.tabTexts")} (${texts.length})`] as const] : []),
          ...(hasVote ? [["vote", t("tracker.tabVote")] as const] : []),
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === k ? "border-[#7c3aed] text-[#7c3aed] dark:text-[#a78bfa]" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "timeline" && (
        <div>
          <div className="mb-3 flex gap-1.5">
            {reviewCount > 0 && (
              <button onClick={() => setSrc("review")} className={`rounded-full px-2.5 py-1 text-xs ${src === "review" ? "bg-[#7c3aed] text-white" : "border border-zinc-200/60 dark:border-zinc-700/60"}`}>{t("tracker.review")} ({reviewCount})</button>
            )}
            {discussCount > 0 && (
              <button onClick={() => setSrc("discuss")} className={`rounded-full px-2.5 py-1 text-xs ${src === "discuss" ? "bg-[#7c3aed] text-white" : "border border-zinc-200/60 dark:border-zinc-700/60"}`}>{t("tracker.discuss")} ({discussCount})</button>
            )}
            <button onClick={() => setSrc("all")} className={`rounded-full px-2.5 py-1 text-xs ${src === "all" ? "bg-[#7c3aed] text-white" : "border border-zinc-200/60 dark:border-zinc-700/60"}`}>{t("tracker.all")} ({timeline.length})</button>
          </div>
          <div className="flex flex-col gap-1">
            {filtered.map((ev, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                <span className="text-xs text-zinc-400">{ev.date || "?"}</span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {ev.type.replace(/_/g, " ")}
                    <span className="ml-1.5 rounded bg-violet-50 px-1 text-[9px] dark:bg-violet-900/20">{ev.source.includes("discuss") ? "discuss" : "review"}</span>
                  </div>
                  {ev.sender && ev.sender !== "Unknown" && <span className="font-medium">{ev.sender}: </span>}
                  <span className="text-zinc-600 dark:text-zinc-300">{(lang === "zh" ? ev.point_zh || ev.snippet : ev.snippet) || ev.subject?.slice(0, 100)}</span>
                  {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-1 text-xs text-[#7c3aed] hover:underline dark:text-[#a78bfa]">[source ↗]</a>}
                </div>
              </div>
            ))}
            {!filtered.length && <div className="text-sm text-zinc-400">No events.</div>}
          </div>
        </div>
      )}

      {tab === "participants" && <ParticipantsList participants={s.participants} />}

      {tab === "texts" && (
        <div className="flex flex-col gap-1.5">
          {texts.map((tx, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-violet-50/40 px-3 py-2 text-sm dark:bg-violet-900/10">
              {tx.version && <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">v{tx.version}</span>}
              <span>{tx.filename}</span>
              <span className="text-xs text-zinc-400">{(tx.size / 1024).toFixed(1)}KB</span>
            </div>
          ))}
        </div>
      )}

      {tab === "vote" && hasVote && s.board_vote && <BoardVoteCard v={s.board_vote} status={s.status} />}
    </div>
  );
}
```

- [ ] **Step 5: tracker-card.tsx（折叠/展开）**

创建 `src/components/tracker/tracker-card.tsx`：

```tsx
"use client";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/badge";
import type { TrackerSubmission } from "@/lib/types";
import { TimelineStrip } from "./timeline-strip";
import { ReviewDetailTabs } from "./review-detail-tabs";

export function TrackerCard({
  s, expanded, onToggleExpand,
}: {
  s: TrackerSubmission;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const { t } = useLang();
  const submitter = s.submitter?.name || "Unknown";
  const msgs = s.stats?.total_messages || 0;
  const days = s.stats?.duration_days || 0;
  const timeline = s.timeline || [];

  return (
    <div
      id={`card-${s.id}`}
      className={`mb-3 rounded-2xl border border-zinc-200/60 bg-white/60 p-5 backdrop-blur-xl transition hover:shadow-lg dark:border-zinc-800/60 dark:bg-zinc-900/40 ${expanded ? "" : "cursor-pointer hover:-translate-y-px"}`}
    >
      <div className="flex items-start justify-between gap-3" onClick={() => !expanded && onToggleExpand(s.id)}>
        <div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {s.name} <span className="text-xs font-normal text-zinc-400">{s.spdx_id ? `(${s.spdx_id})` : ""}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>👤 {submitter}</span>
            {days > 0 && <span>📅 {days} {t("tracker.days")}</span>}
            {msgs > 0 && <span>💬 {msgs} {t("tracker.messages")}</span>}
            <span>👥 {s.participants.length} {t("tracker.participants")}</span>
          </div>
        </div>
        <Badge variant="tag" themeKey={`review-${s.status}`}>{s.status}</Badge>
      </div>

      {timeline.length > 0 && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <TimelineStrip timeline={timeline} submitter={submitter} vote={s.board_vote} />
        </div>
      )}

      <button
        className="mt-3 border-none bg-none p-0 text-sm font-medium text-[#7c3aed] hover:underline dark:text-[#a78bfa]"
        onClick={() => onToggleExpand(s.id)}
      >
        {expanded ? t("tracker.collapse") : t("tracker.expand")}
      </button>

      {expanded && <ReviewDetailTabs s={s} />}
    </div>
  );
}
```

- [ ] **Step 6: tracker-client.tsx 接入 search/sort/filter + 卡片列表**

替换 Task 7 里 tracker-client.tsx 的 return 块（loading/error 部分保留）。在组件内（`if (!data) return ...` 之前）加状态，把 return 改成完整 UI。在 `useEffect` 之后、`if (loadError)` 之前插入：

```tsx
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [activeFilter, setActiveFilter] = useState("all");

  const STATUS_ORDER = ["all", "approved", "rejected", "pending", "withdrawn", "superseded", "legacy"];

  const visibleAll = useMemo(
    () => data.submissions.filter((s) => !(s.status === "legacy" && (!s.timeline || s.timeline.length === 0))),
    [data]
  );
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of visibleAll) c[s.status] = (c[s.status] || 0) + 1;
    return c;
  }, [visibleAll]);

  const filtered = useMemo(() => {
    let items = visibleAll;
    if (activeFilter !== "all") items = items.filter((s) => s.status === activeFilter);
    const q = query.toLowerCase().trim();
    if (q) {
      items = items.filter((s) => {
        const hay = [
          s.name, s.id, s.spdx_id, ...(s.aliases || []), s.submitter?.name || "",
          ...s.participants.map((p) => p.name),
          ...s.timeline.map((e) => e.sender + " " + e.subject + " " + e.snippet),
        ].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    const order: Record<string, number> = { pending: 0, rejected: 1, withdrawn: 2, superseded: 3, approved: 4, legacy: 5 };
    const arr = [...items];
    switch (sortBy) {
      case "recent": arr.sort((a, b) => (b.stats?.date_range?.[1] || "").localeCompare(a.stats?.date_range?.[1] || "")); break;
      case "status": arr.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || (b.stats?.date_range?.[0] || "").localeCompare(a.stats?.date_range?.[0] || "")); break;
      case "date-desc": arr.sort((a, b) => (b.stats?.date_range?.[0] || "").localeCompare(a.stats?.date_range?.[0] || "")); break;
      case "date-asc": arr.sort((a, b) => (a.stats?.date_range?.[0] || "").localeCompare(b.stats?.date_range?.[0] || "")); break;
      case "msgs": arr.sort((a, b) => (b.stats?.total_messages || 0) - (a.stats?.total_messages || 0)); break;
      case "duration": arr.sort((a, b) => (b.stats?.duration_days || 0) - (a.stats?.duration_days || 0)); break;
      case "name": arr.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return arr;
  }, [visibleAll, activeFilter, query, sortBy]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
```

把 `return ( ... )` 替换为：

```tsx
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] bg-clip-text text-2xl font-bold text-transparent">
          {t("tracker.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t("tracker.subtitle")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("tracker.search")}
          className="w-64 rounded-lg border border-zinc-200/60 bg-white/60 px-3 py-2 text-sm outline-none backdrop-blur focus:border-[#a78bfa] focus:ring-2 focus:ring-violet-200 dark:border-zinc-700/60 dark:bg-zinc-900/40"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-zinc-200/60 bg-white/60 px-2.5 py-2 text-sm dark:border-zinc-700/60 dark:bg-zinc-900/40"
        >
          <option value="recent">{t("tracker.sortRecent")}</option>
          <option value="status">{t("tracker.sortStatus")}</option>
          <option value="date-desc">{t("tracker.sortNewest")}</option>
          <option value="date-asc">{t("tracker.sortOldest")}</option>
          <option value="msgs">{t("tracker.sortMostDiscussed")}</option>
          <option value="duration">{t("tracker.sortLongest")}</option>
          <option value="name">{t("tracker.sortName")}</option>
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_ORDER.filter((st) => st === "all" || (statusCounts[st] || 0) > 0).map((st) => {
          const count = st === "all" ? visibleAll.length : statusCounts[st] || 0;
          const label = st === "all" ? t("tracker.all") : st.charAt(0).toUpperCase() + st.slice(1);
          const active = st === activeFilter;
          const color =
            st === "all" ? "#7c3aed" : st === "approved" ? "#3DA639" : st === "rejected" ? "#B11107"
            : st === "pending" ? "#7c3aed" : st === "withdrawn" ? "#d97706" : st === "superseded" ? "#0284c7" : "#71717a";
          return (
            <button
              key={st}
              onClick={() => setActiveFilter(st)}
              style={active ? { background: color, borderColor: color, color: "#fff" } : {}}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active ? "" : "border-zinc-200/60 bg-white/60 text-zinc-500 hover:text-zinc-800 dark:border-zinc-700/60 dark:bg-zinc-900/40 dark:hover:text-zinc-200"
              }`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-zinc-400">{t("tracker.noResults")}</div>
      ) : (
        filtered.map((s) => (
          <TrackerCard key={s.id} s={s} expanded={expandedIds.has(s.id)} onToggleExpand={toggleExpand} />
        ))
      )}
    </div>
  );
```

并在文件顶部 import 区补：

```tsx
import { TrackerCard } from "@/components/tracker/tracker-card";
```

- [ ] **Step 7: dev 逐项验证**

Run: `npm run dev`，开 `/tracker`：
- 搜索框输入 "vaccine" → 只剩 Vaccine License 卡片
- 状态 filter 点 Rejected → 筛出 rejected
- 展开 Vaccine 卡片 → timeline tab 显示事件，Vote tab 显示红色 REJECTED badge + 9 Yes（绿色）+ tallyNote 说明
- hover timeline strip 节点 → tooltip 出现，边框色匹配节点背景
- 中/英切换 → snippet 切换 point_zh/snippet
- 暗色模式 → 配色正确

- [ ] **Step 8: 验证 focus 跳转生效**

从详情页 unlicense 的 review 块点 "View full review" → 跳 `/tracker?focus=unlicense` → 自动展开 unlicense 卡片 + 滚动居中 + 闪一下高亮（1.7s）。

- [ ] **Step 9: build 验证（SSG 能过）**

Run: `npm run build 2>&1 | tail -30`
Expected: build 成功，`/tracker` 静态生成，无类型错误。

- [ ] **Step 10: Commit**

```bash
git add src/app/tracker/tracker-client.tsx src/components/tracker/
git commit -m "feat: full /tracker UI (search/sort/filter + cards + timeline strip + vote)"
```

---

## Task 9: 文档（OSI-TRACKER.md 拷贝 + 集成架构 + CLAUDE.md + README）

**Files:**
- Create: `docs/OSI-TRACKER.md`（拷贝 KB 原 TRACKER.md）
- Create: `docs/tracker-architecture.md`
- Modify: `CLAUDE.md`（加 tracker 同步章节）
- Modify: `README.md`, `README.zh-CN.md`（入口/说明）

**Interfaces:**
- Consumes: KB `data/osi/TRACKER.md`、本计划

- [ ] **Step 1: 拷贝 TRACKER.md**

Run: `cp /Users/momo/Documents/workspace/KB/data/osi/TRACKER.md /Users/momo/Documents/workspace/license-atlas/docs/OSI-TRACKER.md`

- [ ] **Step 2: 写集成架构文档**

创建 `docs/tracker-architecture.md`：

```markdown
# OSI License Review Tracker — 集成架构

## 概述

license-atlas 集成 KB 的 OSI License Review Tracker，提供两种入口：

1. **独立入口** `/tracker` — React/Tailwind 完整复刻 KB tracker 全部功能。
2. **详情页内嵌** `LicenseReviewBlock` — 命中 OSI review 的许可证显示摘要 + 压缩 strip，点击跳 `/tracker?focus=<spdx>`。

## 数据流

KB（source of truth）→ license-atlas 单向同步：

- `public/data/tracker.json`（3.25MB，全量，lazy-load）— cp 自 KB `data/osi/license-review-tracker-v2.json`
- `src/data/tracker-index.json`（~50KB，轻量，build-time）— 供详情页查 spdx→submission 映射

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
```

- [ ] **Step 3: CLAUDE.md 加章节**

在 `CLAUDE.md` 的 "## Data Pipeline" 章节末尾（`### KB 爬取来源` 表之前或合适位置）加：

```markdown
## OSI License Review Tracker

集成 KB 的 OSI License Review Tracker，提供 `/tracker` 独立入口 + 详情页内嵌 review 块。

- 数据：`public/data/tracker.json`（全量，lazy-load）+ `src/data/tracker-index.json`（轻量映射）
- 同步：`npm run sync:tracker`（hash 增量检测，幂等）
- 全链路：`npm run update:tracker [--full]`（调 KB build/enrich/LLM + sync）
- `npm run build` 已内嵌 sync，每次构建自动检测同步
- KB 侧构建细节：`docs/OSI-TRACKER.md`；集成架构：`docs/tracker-architecture.md`

### 更新 tracker Checklist

修改 KB OSI 数据后：
1. `npm run sync:tracker`（或直接 `npm run build`，会自动同步）
2. 若要重跑 KB 全链路：`npm run update:tracker`（增量 LLM）/ `--full`（全量）
3. 详情页 review 块自动从 `tracker-index.json` 读取，无需额外操作
```

- [ ] **Step 4: README 加入口**

在 `README.md` 和 `README.zh-CN.md` 的功能/导航描述里，在 About 旁边加一行 Review Tracker 入口说明（`/tracker`）。具体文案视现有 README 结构，最小改动：在导航列表加 `- Review Tracker (/tracker)` 一项。

- [ ] **Step 5: Commit**

```bash
git add docs/OSI-TRACKER.md docs/tracker-architecture.md CLAUDE.md README.md README.zh-CN.md
git commit -m "docs: OSI-TRACKER.md copy + tracker architecture + CLAUDE.md/README updates"
```

---

## Task 10: 整体验证 + dev server 预览

**Files:** 无（验证为主）

- [ ] **Step 1: 全量 build**

Run: `npm run build 2>&1 | tail -30`
Expected: build 成功，`/tracker`、`/about`、所有 `/licenses/*` 静态生成。

- [ ] **Step 2: 幂等性再验**

Run: `node scripts/sync-tracker.mjs`
Expected: `✓ tracker 无变化 ...，跳过同步`（Task 8 的 build 已同步过）。

- [ ] **Step 3: lint**

Run: `npm run lint 2>&1 | tail -10`
Expected: 无 error。

- [ ] **Step 4: 对照 KB 逐项点验**

开 KB standalone.html（`/Users/momo/Documents/workspace/KB/data/osi/license-review-tracker-standalone.html`，用浏览器直接开）与 atlas `/tracker` 并排，随机抽 5 个 submission（approved/rejected/pending/withdrawn/superseded 各一）核对：
- status badge 颜色一致（语义色，允许 atlas 调色差异）
- timeline strip 节点形状/数量一致
- tooltip 内容（sender/snippet/sentiment）一致
- board vote outcome + tally 与 KB 一致（尤其 Vaccine 的 REJECTED + 9 Yes 说明）

- [ ] **Step 5: 详情页 review 块抽查**

开 3 个详情页确认：
- unlicense（approved，有 timeline）→ 块显示 approved + strip + 跳转
- mit（legacy，无 timeline）→ 块显示 legacy，无 strip
- 某 proprietary terms（无 spdx）→ 无块

- [ ] **Step 6: 留 dev server 给用户预览**

Run（后台）: `npm run dev`，告知用户 `http://localhost:3000/license.atlas/tracker`。
不 commit、不 push、不部署。

- [ ] **Step 7: 最终 commit（如有遗漏改动）**

```bash
git status
# 若有未提交改动：
git add -A && git commit -m "chore: tracker integration final touches"
```

---

## 完成标准

- [ ] `/tracker` 完整复刻 KB tracker 全部交互，风格统一（Geist + atlas 语义色）
- [ ] 116 个命中 spdx 的详情页显示 review 块，点击跳转自动定位展开高亮
- [ ] `npm run build` 内嵌 sync，幂等
- [ ] `npm run sync:tracker` / `npm run update:tracker` 可用
- [ ] 文档齐全（OSI-TRACKER.md / tracker-architecture.md / CLAUDE.md / README）
- [ ] dev server 跑起来供本地预览，未 push 未部署
