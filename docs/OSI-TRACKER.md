# OSI License Review Tracker

可视化 OSI 许可证审批全流程的独立页面：提交 → 邮件讨论 → 董事会投票 → 结果。

- **页面**：`data/osi/license-review-tracker.html`（通过 HTTP fetch `license-review-tracker-v2.json`，需 `python3 -m http.server` 起本地服务）
- **数据**：`data/osi/license-review-tracker-v2.json`（enrich 后的最终数据）
- **规模**：174 个提交（approved 102 / rejected 37 / withdrawn 4 / pending 8 / superseded 3 / legacy 20）
- **离线版**：`license-review-tracker-standalone.html`（JSON 内嵌，`file://` 可直开）。每次重建 v2 后需同步重新嵌入 JSON；当前已同步到 2026-06-20 的 board-vote exhaustive audit + ModelGo series + 全量 point 修复。

## 数据管线

```
OSI Pipermail 增量抓取（license-review + license-discuss）
        │
        ▼
update-mail-archives.mjs → rebuild-mail-indexes.mjs → update-pending-submissions.mjs
        │
        ▼
LLM 批次清洗（/tmp/llm-batches/batch-*.out.json：{clean,point_en,point_zh,sentiment}）
        │
        ▼
apply-llm-batches.mjs              →  all-points-manifest.json + points-manifest.json（双语观点）
        │
        ▼
邮件原文 + OSI API + 人工标注
        │
        ▼
build-license-review-tracker.mjs  →  license-review-tracker.json  (base)
        │
        ▼
enrich-license-tracker.mjs        →  license-review-tracker-v2.json (final)
        │
        ▼
check-point-manifest-coverage.mjs  →  确保所有邮件 timeline event 都有 point manifest
        │
        ▼
check-license-texts.mjs            →  验证 license_texts 结构、去重、版本号与 timeline 回链
        │
        ▼
手动重新嵌入 JSON 到 standalone HTML（无专用 embed 脚本）
```

重跑：

```bash
# Atlas 一条龙入口（推荐）：刷新最近 2 个月 review/discuss 邮件、重建 KB tracker、同步到 Atlas
npm run update:tracker

# 指定月份/范围
npm run update:tracker -- --month 2026-06
npm run update:tracker -- --since 2026-01

# KB 内部手动流程
node scripts/update-mail-archives.mjs --month 2026-06 --lists license-review,license-discuss
node scripts/rebuild-mail-indexes.mjs
node scripts/update-pending-submissions.mjs --since 2026-06

# 仅当有新 LLM 批次产物在 /tmp/llm-batches 时才跑（幂等合并）
node scripts/apply-llm-batches.mjs            # batch-*.out.json → 两个 manifest
node scripts/build-license-review-tracker.mjs
node scripts/enrich-license-tracker.mjs
node scripts/check-point-manifest-coverage.mjs
node scripts/check-license-texts.mjs
node scripts/test-tracker-data.mjs        # 数据质量检查（--verbose 显示详情）
# 页面用 HTTP fetch，需起本地服务；若浏览器直接 file:// 打开普通版会因 fetch 本地 JSON 失败而空白
cd data/osi && python3 -m http.server 8770 --bind 127.0.0.1

# standalone 版需手动刷新内嵌 JSON（普通版 HTML 作为模板）
node -e "const fs=require('fs'); const html=fs.readFileSync('data/osi/license-review-tracker.html','utf8'); const data=fs.readFileSync('data/osi/license-review-tracker-v2.json','utf8').replace(/<\\\\/script/gi,'<\\\\\\\\/script'); const marker='<script>\\n// ── Data Loading ──'; const out=html.replace(marker, '<script id=\\\"embedded-data\\\" type=\\\"application/json\\\">'+data+'</script>\\n'+marker); fs.writeFileSync('data/osi/license-review-tracker-standalone.html', out);"
```

### apply-llm-batches.mjs（LLM 观点合并，2026-06-18 新增）

把 `/tmp/llm-batches/batch-*.out.json`（codex/subagent 跑出的 `{clean, point_en, point_zh, sentiment}`）合并回两个 manifest：

- `all-points-manifest.json`（2898 条，build 读）：写 `{point(=point_en 别名), point_en, point_zh, sentiment}`，clean 不存
- `points-manifest.json`（102 条子集，enrich 读）：仅更新落在子集内的条目

同 url 多 id（timeline 事件复用消息）取最后非空值；clean 为空的条目三字段设 null、sentiment=neutral。幂等、安全覆盖。

**JSON 容错**：LLM out 文件偶尔会在中文 `point_zh` 内写未转义英文双引号（如 `"AI 系统"`），导致 JSON.parse 失败。脚本内置 `jsonRepair()`，会把字符串值内部裸英文双引号改为中文引号 `「」` 后重试解析；真正无法修复的批次只跳过，不中断整个 merge。

### build-license-review-tracker.mjs（base 构建）

合并多个 `_index/` 数据源，输出 `license-review-tracker.json`。

| 数据源 | 文件 | 作用 |
|--------|------|------|
| OSI API | `osi-api-licenses.json` | 122 个 OSI 认可许可证的元数据（submission/approval date、board minutes URL） |
| 邮件聚类 | `thread-clusters.json` | 完整邮件线程（review + discuss），按 subject 聚类 |
| license-review 邮件 | `messages.json` | license-review 列表 6087 条，含 from + body_preview |
| license-discuss 补充 | `discuss-supplement.json` | 66 个 submission 的 discuss 邮件（1973 条），含 body |
| 摘要 | `license-summaries.json` | 102 个 approved 许可证的 key_messages 精选 |
| 拒绝/撤回/待定 | `rejected-withdrawn-pending.json` | 52 个非 approved 提交/待定提交的人工标注与自动发现条目 |

构建产物每条 timeline event 含 `source` 字段。邮件事件为 `license-review` 或 `license-discuss`，由 `detectSource()` 判定（source_file hint → URL 路径 → 合并消息 source 三级优先级）。少数 OSI API 补位事件为 `osi_api`（见下）。

**同族 cluster 合并**（`merge_clusters`）：`rejected-withdrawn-pending.json` 的 entry 默认只取 curated timeline 命中的**第一个** cluster。部分提交的评审横跨多个兄弟线程（多次 resubmission、平行变体讨论），单 cluster 会漏掉大量邮件。entry 可声明 `merge_clusters: ["<subject 关键词>"]`，build 会扫描所有 `thread-clusters`，按 `normalized_subject` 命中关键词（排除 off-topic）的 cluster 全部合并、按 URL 去重。当前用于 **ModelGo**（14 个同族 cluster，113 封邮件，跨 2025-02-10 → 2026-05-26）。合并路径的 sender 兜底链：`urlToMessage.from → urlToSender → md loader 的 from`（discuss 邮件只在 .md archive 有 sender）。

### enrich-license-tracker.mjs（enrich + 兜底）

在 base 上关联许可证原文 + 提取董事会投票 + 补全 sender，输出 `license-review-tracker-v2.json`。

**三步**：

1. **License text 关联**：从 KB 本地已下载附件和 Pipermail 月度 archive 的 MIME part 中抽取“许可证原文”。旧 `mail/licenses/*.txt` 里的 `license-inline` 只有在能切出明确 license block 时才保留；整封提交邮件、FAQ、OSD notes、代码附件、diff、签名等会被过滤。
2. **Board vote 提取**：从 `data/osi/minutes/`（221 个 .md）解析动议 + 投票，按许可证名 + 日期评分匹配。
3. **Sender 修正 + participants 构建**：用 messages.json 的 URL→sender 映射修正 Unknown sender。

**Timeline sender 显示规范化（2026-06-20）**：timeline event 层同样应用 `displayName()`，不只处理 `submitter` / `participants`。Pipermail 全小写 sender（如 `subham mahesh`）显示为 `Subham Mahesh`；伪邮箱/地址式 sender（含 ` at ` / `@` / 域名后缀）不做 title-case，避免 `cowan at ccil.org` 被误改。

**API-derived submission 兜底（2026-06-20）**：少数 OSI API 记录有 `submitter_name` / `submission_date`，但公开 Pipermail timeline 没有该 submitter 的具体邮件。典型例子是 WordNet：OSI API 指向 2025-April `thread.html`，官方 archive index 无具体 message 链接，可见 WordNet thread 从 Josh/McCoy 后续讨论开始。`enrich-license-tracker.mjs` 仅在 submitter 不出现在任何 timeline sender 中时插入一条 `source: "osi_api"` 的 synthetic `submission` event，带内联 `point/point_zh`，`url` 指向 `https://opensource.org/api/license/{id}`。它参与 timeline 日期范围和 participants，但不计入 `stats.total_messages`（邮件数）。`check-point-manifest-coverage.mjs` 跳过 `source==="osi_api"`，因为它不是 LLM-cleaned Pipermail message。

**License text 结构化（2026-06-20，修正）**：`enrich-license-tracker.mjs` 输出的是提交到 OSI 的许可证原文版本，不是邮件意见或提交说明。来源包括：`type=license-attachment` 的本地附件文件、Pipermail message 中 `-------------- next part --------------` 后的 plain-text MIME part（例如 ModelGo 提交邮件中“license text file is attached below”后的正文），以及邮件正文里明确以 `Text of the license:` / `License text:` 等 marker 引出的内联许可证块（例如 Mulan PSL v1/v2）。抽取器对中英文 license cue 共同评分，支持 `本许可证`、`木兰公共许可证`、`木兰宽松许可证`、`授权`、`免责声明`、`责任限制` 等中文条款信号；同时拒绝整封提交邮件、FAQ、OSD notes、代码附件、diff、签名、`Original Message` 转发块和 mailing-list footer。抽取后写入稳定 `id`、`sha256`、`duplicate_of`、`text`、`display_text`、`normalized_text`、`extraction_confidence`。同 submission 内相同正文 hash 的后续文件标记 `duplicate_of`；若 `message_url` 或 `source_url` 命中 timeline event，则写入 `event_index/event_type`，并在 timeline event 上追加 `text_ids`。当前保守口径：115 条 license_texts，83 条直接回链 timeline，24 条重复内容标记。ModelGo 有 23 条真实文本，覆盖 `MG0` / `MG-BY` / `MG-BY-OS` / `MG-BY-SA` 四系列；Mulan Public License v2 有 2 条真实文本，Mulan PSL v2 有 6 条 v1/v2 历史文本。

**License text diff（2026-06-20，修正）**：`buildLicenseTextDiffs()` 只比较同一 `series` 内、非 duplicate 的相邻文本版本，生成 line-level LCS diff：`stats.added/removed/unchanged` + context hunks。跨 series 不比较，避免 ModelGo 四变体互相产生噪声。当前生成 34 个同系列相邻版本 diff；超大文本对会标记 `too_large` 而不内嵌 hunks。

**License text 验证 gate**：`check-license-texts.mjs` / Atlas `check-tracker-license-texts.mjs` 检查全局 text id 唯一、source/message URL、sha256、正文非空、可疑版本号（如 `20`/`10`）拦截、排序、duplicate canonical、timeline 反向 `text_ids`、diff from/to id 与同 series 约束、ModelGo 四系列。未命中的历史 source URL 仅 warning，因为很多旧 license text 文件来自 sibling/legacy thread，不能强行绑定。

> 🔑 **vote 的唯一权威数据源是 board meeting minutes，不是邮件正文。** OSI 董事会投票走线下会议，结果以 board decision 公告形式发回邮件列表（如 Ritchey 的 "Board adopted... did NOT approve"）。邮件正文里几乎不存在 "I move to approve" 这类真投票——任何从邮件正文抓 vote 的尝试都是引用块误判。`board_vote` 字段**只**由 `findBoardVotes()` 从 `data/osi/minutes/*.md`（221 个）提取，timeline event 的 `type` 不应含 `vote`。

**Board vote 匹配的收紧规则**（防误配）：

- `ADMIN_NOISE` 正则过滤行政动议（approve minutes / budget / elections 等）
- **关键词归一化**：`normalizeText()` 先做 Unicode NFD + 去重音，再抽关键词；避免 `Québec` 被拆成 `qu`/`bec`，导致 LiLiQ 不能命中 2016 Quebec Licenses motion。
- **泛词过滤**：`licenses`、`international`、`category`、`legacy`、`variant`、`compatible` 等不再参与 vote 匹配，避免 LiLiQ 误命中 Mulan PSL、PostgreSQL 误命中 LBNL BSD、CNRI-Python 误命中 SimPL。
- **相关性 gate**：minutes 动议必须真正提及许可证——name fragment 命中，或 ≥2 个非泛化关键词重叠，否则丢弃。
- **硬冲突**：BSD `N-Clause` 数字冲突直接拒绝（如 BSD-2-Clause / 0BSD 不可匹配 BSD-1-Clause motion）；`Original/Draft` 条目不可匹配同族 `Beta N` motion（CAL original vs CAL beta 4）；对称地，`Beta N` 条目不可匹配无 beta 字样的版本 motion（CAL Beta 4 不匹配 "Version 1.0" 拒绝票——该票属 Original Draft）。
- **fragment 词边界匹配（2026-06-18）**：name fragment 命中要求前后是分隔符（空格/标点/首尾），而非字母数字或连字符。否则降为 +5 弱信号。修复 `bsd-3-clause` 在 motion `bsd-3-clause-open-mpi` 中被当精确命中（前者是后者子串）。
- **alias 邮件标题清洗（2026-06-18）**：`findBoardVotes` 构建 names 前剥离邮件标题前缀（`Re:`/`Fwd:`/`For approval:`/`License Approval Request:`/`Approval Request:`），并丢弃清洗后等于**他者规范名**的 alias。修复 bsd-3-clause 的 alias `"License Approval Request: BSD-3-Clause-Open-MPI"` 注入 `mpi` keyword、回声他者许可证名导致串配。
- **STOP_WORDS 扩展（2026-06-18）**：补入邮件/行政噪声词（`posted`/`web`/`now`/`with`/`terms`/`non`/`profit`/`inc`/`simple`/`seats`/`vacant`/`appointed`/`affiliate`/`application` 等），避免泛词凑数通过 relevance gate。修复 nasa-1-3（alias "posted on the web" 命中 "post to the web" admin motion）、whonix（with/terms 命中席位任命 motion）、unicode×2（inc/agreement 命中 BigBlueButton）、nposl-3-0（non/profit 命中 Affiliate motion）。
- **cross-reference 拒绝（2026-06-18）**：step 3 开头构建 `otherCanonicalIds`（所有 submission 的 spdx_id/id/normalized name 集合）。`findBoardVotes` 打分时，若 motion 文本以词边界方式**精确包含他者规范名**（≥8 字符且含连字符或版本数字，排除泛词），直接 `-999` 拒绝。最后一道防线，挡 alias 未覆盖的他者许可证 motion。
- **未完成条目日期门槛（2026-06-20）**：`pending` / `withdrawn` / `superseded` 条目若 minutes vote 日期早于 timeline 起点超过 30 天，直接拒绝匹配。修复 ModelGo family aliases（`Attribution` 等）误抢 2007 年 attribution 相关 minutes 的问题，同时不影响 approved/rejected 历史条目的既有绑定。
- **minutes URL**：解析 minutes frontmatter 的 `source_url` 到 `board_vote.minutes_url`；UI 优先显示 OSI board minutes URL，不显示本地 `.md` 文件名。`normalizeBoardMinutesUrl()` 会把 OSI API 中遗留的旧 XWiki board-minutes URL（如 `wiki.opensource.org/.../Board%20minutes/2020/2020-05-11`）规范化为当前公开页面 `https://opensource.org/meeting-minutes/YYYY-MM-DD`。
- `deriveFallbackVote()`：minutes 匹配失败时，从 timeline 的 board_decision 公告或 OSI API metadata 降级推导；OSI API 的 `board_minutes` 先经 `normalizeBoardMinutesUrl()` 再写入 `minutes_url`。

**Outcome 回填**（三道，按顺序）：

1. motion_text 含 reject/decline 词 → `rejected`
2. 有 yes/no 票数 → 按票数推导（yes>no → approved）
3. **OSI approved list 兜底**：id 在 `osi-api-licenses.json` 中 → `approved`

> ⚠️ OSI API 的 `approved` 字段不可靠（122 个仅 3 个 true，BSD/EUPL 等 legacy 居然 false）。**用 list 成员资格**作批准信号——能进该集合即 OSI 认可。已验证 122 成员在 tracker 全为 approved/legacy，0 矛盾。

**Status 校对**：OSI list 成员若 tracker status 非 approved/legacy → 改 approved（权威源覆盖邮件分类推断；当前 0 例）。

当前覆盖（2026-06-20 exhaustive audit 后）：board_vote 77 个（minutes 50 / timeline 3 / osi_api 24）；含详细 `vote` 对象 50 个；outcome null 0 个；minutes-sourced board vote 可疑串配 0。2026-06-18 全量审计修复 LiLiQ-Rplus/R/P，不再误显示 Mulan PSL v2 motion，并清除 7 个历史串配（nasa-1-3→admin motion、bsd-3-clause→Open-MPI motion、whonix→席位任命、unicode-3-0/unicode-dfs-2016→BigBlueButton、nposl-3-0→Affiliate、whonix outcome=null）。2026-06-20 再审计补齐旧 minutes 中更杂的明确票数格式，恢复 Fair、Boost、RPL 1.5、Multics、ECL 2.0、Artistic 2.0、LBNL BSD、MIT-CMU、LANL BSD、WordNet、CDDL 1.1、eCos、EPL 2.0、OSC 1.0、OpenLDAP 2.8、ISC、GPLv3、LGPLv3、NPOSL/OSL/AFL 3.0 等 vote 绑定。

**Timeline point 合并优先级（2026-06-18 修正）**：`build-license-review-tracker.mjs` 已从 `all-points-manifest.json` 注入全量 `snippet=point_en`、`point_zh`、`sentiment`。`enrich-license-tracker.mjs` 只做兜底，不应再用早期 102 子集 `points-manifest.json` 覆盖 base 中已存在的全量 point。当前规则：`point = ev.point || ev.snippet || pm.point || null`，`point_zh = ev.point_zh || pm.point_zh || null`。这个顺序避免 ModelGo 等全量批次结果被旧 points manifest 回滚。

### 其他脚本

- `extract-discuss-messages.mjs`：生成 `discuss-supplement.json`（两阶段匹配 discuss 邮件到 submission）
- `extract-full-bodies.mjs`：从月度 .md 预提取完整邮件正文到 `submissions/`（供 deep analysis 用）
- `apply-llm-batches.mjs`：合并 LLM 批次清洗产物到两个 manifest（见上"apply-llm-batches.mjs"）
- `test-tracker-data.mjs`：数据质量检查

## 数据模型（submission）

```jsonc
{
  "id": "bsd-3-clause",
  "name": "...", "aliases": [], "spdx_id": "BSD-3-Clause",
  "status": "approved",            // approved|rejected|withdrawn|pending|superseded|legacy
  "submitter": { "name": "..." },
  "participants": [{ "name", "role", "message_count" }],
  "license_texts": [{
    "id", "filename", "title",
    "version", "version_label", "revision_label", "series",
    "date", "source_url", "message_url", "message_subject", "type",
    "sha256", "duplicate_of", "extraction_confidence",
    "text", "display_text", "normalized_text", "content_preview", "size",
    "event_index", "event_type"
  }],
  "license_text_diffs": [{
    "id", "series",
    "from_text_id", "to_text_id", "from_label", "to_label",
    "from_date", "to_date",
    "stats": { "added", "removed", "unchanged" },
    "too_large", "truncated",
    "hunks": [{ "old_start", "new_start", "lines": [{ "type", "text" }] }]
  }],
  "timeline": [{                   // review/discuss 事件流
    "date", "type",                // type: submission|revision|withdrawal|board_decision|feedback|status_inquiry（无 vote）
    "subject", "url", "sender", "snippet",
    "point", "point_zh", "sentiment", // LLM 双语观点 + 情感（build 从 all-points 注入；enrich 仅兜底）
    "source",                      // license-review | license-discuss | osi_api
    "position",                    // support|oppose|question|procedural|neutral
    "text_ids"                     // 可选：该邮件关联的 license_text ids
  }],
  "board_vote": {                  // 可选
    "date", "motion_by", "motion_text", "second_by", "discussion",
    "vote": { "yes", "no", "abstain" },  // 可能 null（无票数记录）
    "outcome": "approved|rejected",       // 可能 null（仅 1 例）
    "source": "minutes|timeline|osi_api",
    "minutes_file": "..."
  },
  "rejection_reason": "",
  "osi_api_data": { ... } | null,
  "stats": { "total_messages", "date_range", "duration_days", "unique_participants" }
}
```

## UI 行为

- **统一 filter + stats bar**：顶部 `.controls` 合并两行——`filter-row`（All/Approved/Rejected/Pending/Withdrawn/Superseded/Legacy，各按钮自带 status 颜色 `data-color`，活跃态用对应色填充+白字，非活跃 hover 时边框/文字变色）+ `stat-row`（Events / Discuss 两个 chip）。status 计数直接显示在 filter 按钮上，故不再单独列 stats-bar 的重复计数。`stat-row` 用 `display:contents` 并入 `filter-row` DOM，Events/Discuss chip 紧跟 Legacy 按钮后同一行（不独占整行），窄屏 flex-wrap 才换行。
- **默认按最新活动排序**：`sortSelect` 默认 `recent`（按 `stats.date_range[1]` 即 timeline 最后事件日期降序，最新评审的许可证排最前）；无 timeline 的 legacy 落底。其他选项：Status / Newest Submitted（起始日期）/ Oldest / Most Discussed / Longest Review / Name。
- **Timeline strip**：所有事件自适应换行；点击事件节点 → 展开卡片 + 切 Timeline tab + 滚动高亮该事件；点击 🗳️ vote 节点 → 切 Board Vote tab
- **Timeline 默认 source 视图（按事件构成决定）**：`defaultSrc = reviewCount === 0 ? 'discuss' : 'review'`。纯 discuss 卡片（如 qmail，timeline 全是 license-discuss）默认 active=Discuss，否则默认 Review。非默认源的事件初始 `style="display:none"` 隐藏（innerHTML 渲染不执行注入 script，故用 inline style 定初态）。某源事件数为 0 时该按钮不渲染（reviewCount=0 不显示 Review 按钮）。固定默认 Review 会让纯 discuss 卡片展开后全隐藏，点 strip 节点 `scrollIntoView` 作用于隐藏行 → 无法跳转，故改为按构成决定。
- **许可证家族 series 分组**（如 ModelGo）：当 timeline 跨 ≥2 个 series（`seriesOf()` 按 subject 识别 Zero/Attribution-OpenSource/Attribution/ShareAlike，其余归 General），渲染 `.tl-series-row`——每系列一个带色按钮（`--series-color`；Zero=青、Attribution=绿、Attribution-OpenSource=橙、ShareAlike=粉、General=灰）。显示名统一用 ModelGo 短码：Zero→`MG0`、Attribution→`MG-BY`、Attribution-OpenSource→`MG-BY-OS`、ShareAlike→`MG-BY-SA`；显示顺序固定为 `MG0 → MG-BY → MG-BY-OS → MG-BY-SA → General`。点击 toggle 关闭/开启该系列（`data-series-hidden`）。与 Review/Discuss/All source filter **正交**：事件显示 = source 匹配 **且** series 未关闭。每个事件 header 附 `.tl-series-pill`（同色）。当前仅 ModelGo 触发（4 系列 + General）。
- **ModelGo family 展示名**：KB source 中 `modelgo-attribution-v2` 的 id 保持不变以保护历史 URL/Atlas mapping，但展示 `name` 改为 `ModelGo License Family v2.0`；四个具体变体写入 aliases：`ModelGo Zero` / `Attribution` / `Attribution-OpenSource` / `Attribution-ShareAlike` 和短码 `MG0` / `MG-BY` / `MG-BY-OS` / `MG-BY-SA`。
- **Timeline opinion 行内显示**：事件详情按 `sender: opinion [source ↗]` 顺序显示。`.tl-snippet` 是 inline span，不再使用 `display:-webkit-box` / `line-clamp`，避免人名后强制换行；长 opinion 只按自然文本换行。`[source ↗]` 链接 `white-space: nowrap`，且用 `&nbsp;` 贴住 opinion 尾部，避免 source 单独换行。
- **多卡片展开**：展开状态由 `expandedIds = new Set()` 管理，不再使用单一 `expandedId`；点击某个 `Expand details` 只切换当前 license，不会折叠其他已展开卡片。`focusTab()` / `stripClick()` 只确保目标卡片加入 `expandedIds`，同样不关闭其他卡片。
- **Participants 点击隔离**：meta 行 `👥 N participants` 点击只展开 Participants tab（`focusTab` + stopPropagation），不触发整卡 toggleExpand
- **Participants role 显示**：`formatRole()` 统一格式化角色名，把 `board_member` / `submitter` / `reviewer` 等内部值显示为 `Board Member` / `Submitter` / `Reviewer`。`roleClass()` 生成低饱和 role badge：Submitter=绿、Board Member=蓝、Reviewer=灰，普通 participants 和 deep-analysis participants 共用同一套显示。
- **voted-pending 兜底**：若 status=pending/withdrawn 但 board_vote.outcome=approved/rejected，badge 用 outcome 显示并加 `*` + tooltip 说明
- **中/EN 切换**：header `中/EN` 按钮（`toggleLang`，localStorage 持久化，默认按 `navigator.language`）。zh 态 timeline snippet 显示 `point_zh`，回退英文 `point`/`snippet`；en 态显示 `snippet`。timeline-strip hover 节点的 `.tl-tip` 浮窗同样跟随语言。
- **打开方式**：普通版 `license-review-tracker.html` 通过 HTTP fetch `license-review-tracker-v2.json`，需 `python3 -m http.server ...`；浏览器直接 `file://` 打开可能空白。离线直开使用 `license-review-tracker-standalone.html`。
- **Vote 按 outcome 着色**：strip 的 🗳️ vote 节点和 Board Vote 卡片 header 的颜色由 `board_vote.outcome` 驱动（rejected→红、approved→绿），**不是** yes 票数。卡片 header 加 outcome badge（红 `REJECTED`/绿 `APPROVED`）；当 outcome=rejected 且 motion 含 withhold/reject 且 yes>no 时，加 ⚠️ 说明行 "The 9-0 vote PASSED the motion to withhold approval — i.e. the board voted to REJECT the license"（消除 Vaccine License "9-0 绿✓ 像通过"的误读）。
- **深色模式**、事件 tooltip、timeline Review/Discuss 过滤
- **空 legacy 卡片隐藏**：20 个 pre-review-era 许可证（GPL v1、Apache 1.1、BSD-2-Clause、LGPL 2.0/2.1、MPL 1.0、Artistic 1.0、Nokia、Watcom 等）早于邮件审批流程，无公开评审线程，timeline 为空。`applyFilters` 在 status filter 之前剔除 `status==='legacy' && timeline 为空` 的条目（已验证 legacy+非空 timeline 为 0，故该条件唯一锁定这 20 个），搜索/排序/计数都不再触及，比渲染层隐藏更彻底。`renderFilters` 改为运行时对 visible 集重算 status 计数（不再读构建期 `DATA.meta.by_status`），All 174→154、Legacy 20→0；计为 0 的 status 不渲染 filter 按钮。这些许可证是"无数据"而非"待评审"，整张隐藏比空卡片更准确。
- **stripClick 隐藏行兜底**：即便默认源已对齐，用户手动切到 Review 后点 discuss 节点（或反之），目标行仍会被隐藏。`stripClick` 在 timeline 分支补防御：目标 `#ev-{idx}` 若 `display:none`，先点该卡片的 All 按钮展开全部再 `scrollIntoView` + 高亮，保证跳转始终可见。

## 已知数据缺口

- 35 个 unknown submitter + 部分 empty snippet：license-discuss 早期邮件（2005-2007）未爬取，messages.json 仅含 license-review，supplement 仅覆盖 66 个 submission。需扩展爬虫补全。

## clean_body 清洗（2026-06-16 新增）

**问题**：原 `body_preview` 只有 200 字符，常落在引用链（`> On ... wrote:`）里，导致分类和观点提取污染。

**解决**：`scripts/clean-mail-body.mjs` 导出 `cleanBody(rawBody)`，剥离：
- `>` / `>>` 多级引用开头的行
- `On ... wrote:` / `在 ...写道` 等引用前缀及之后全部
- 裸引用 header（无 `On` 无日期，2008-2009 license-review 老式风格）：`zooko wrote:` / `<name> scripsit:` / `<name> dixit:` / `Quoting <name> (email):` / `<name> wrote, but did not assert:` / `From: <name> [email]`
- `_______________________________________________` 邮件列表签名
- `-------------- next part --------------` / MIME boundary
- mailing list / mailman/listinfo 脚注
- 短称呼行（Dear/Hi/Hello/Hi all/All）
- 短署名（仅紧跟 signoff 的单纯人名行）

**Top-posting 引用修复（2026-06-18）**：`mergeWrappedHeaders()` 曾对完整的 `On ... wrote:` header 继续向后合并，把紧跟的 `>` 引用行吞入同一行，导致规则 1（删 `>` 行）漏删，污染 David Woolley 等 top-posting 邮件摘要。修复：若当前 `On ... wrote/writes/said/sent:` 行本身已经完整（以引用动词结尾），直接保留，不向后合并。自测 Case 1 通过；ModelGo 噪声扫描 `On ... wrote:` / `wrote: >` / 行首 `>` 残留为 0。

**翻译质量修复（2026-06-18）**：早期 LLM 批次对 2008-2009 TGPPL 线程的引用块未剥离，导致 60 条 `point_zh`/`point_en` 是整段英文原文（含 `wrote:`、`Quoting`、`scripsit` 等引用 header）。修复方式：(1) 扩展 `cleanBody` 覆盖上述裸引用前缀（根治）；(2) 对这 60 条基于干净 `clean_body` 手写准确的中英文 point，经 `/tmp/leaky-overrides.json` 注入 `all-points-manifest.json`（更新 point/point_en/point_zh，保留 sentiment）。修后全局扫描「中文条目含 6+ 连续英文词且非专有名词」残余 0。

**使用**：`scripts/md-message-loader.mjs` 加载 `.md` archives 时自动调用 `cleanBody`，返回 URL → `{url, subject, from, date, body, clean_body}` map。`build-license-review-tracker.mjs` 的 `classifyEvent` 和 `detectPosition` 改用 `clean_body` 而非 `body_preview`。

**效果**：
- 分类从基于 subject（共享线程标题，78% 误判）改为基于 sender 自己的 clean_body
- AI-MIT：1 submission + 34 feedback（正确）
- Ritchey：1 submission + 38 feedback + 2 board_decision（末尾 committee recommendation + board adopted 正确）
- 3D Slicer：3 submission + 38 feedback（正确）

## points manifest（2026-06-16 新增）

**目的**：为关键事件（submission/revision/withdrawal/board_decision）提取一句话 point + submission 的 org/role。

**生成**：`scripts/extract-points.mjs` 读取 `data/osi/mail/_index/submissions/*.json`，调用 LLM 提取。prompt 见 `scripts/prompts/extract-point.md`。

> 📌 **当前数据流**：point 字段现由 `apply-llm-batches.mjs` 从全量 LLM 批次（2898 manifest entries，双语 point_en/point_zh）合并注入，而非此节描述的单语 extract-points（后者是早期 102 子集，已被批次产物覆盖/补齐）。单数 `point` = `point_en` 的别名（build/enrich 仍读 `.point`），新增 `point_zh` 透传到 tracker.json/v2.json 供 HTML 中英切换。

**输出**：`data/osi/mail/_index/points-manifest.json`，格式：
```json
{
  "<url>": {
    "point": "string|null",
    "submitter_org": "string|null",
    "submitter_role": "string|null"
  }
}
```

**规模**：106 关键事件（submission 82、board_decision 19、withdrawal 3、revision 2），manifest 102 条目（4 个 URL 重复），submitter_org 非空 32、submitter_role 非空 17。

**注入**：`enrich-license-tracker.mjs` 加载 manifest，timeline event 添加 `point` 字段，submitter 添加 `org`/`role`。

**提取规则**：
- point：一句话，与邮件同语言，≤30 词，客观概括 sender 本次动作/诉求/决定
- submission：说明提交什么许可证、目的/特点
- revision：说明新版改了什么
- withdrawal：说明撤回及原因
- board_decision：说明委员会/董事会决定和 outcome
- submitter_org/role：仅 submission，从签名块或明确自述提取，不猜邮箱域名

**已知疑点**（部分已修复）：原 tracker 的 submission 分类有误——bsd-3-clause-open-mpi idx=6、wordnet idx=3 的"董事会批准公告"邮件被感谢语 "Thank you for submitting this license for review" 误判为 submission。**已在 classifyEvent 主语/宾语约束修复中解决**（见下"Event type 分类防误判"）——这两条现正确分为 `board_decision`。剩余少量第三方反馈被标 submission 的边界 case 仍在观察。manifest 按当前 type 提取 point，不影响数据流。

## Event type 定义（2026-06-16 更新）

基于 clean_body 的分类，不再用 subject：

| type | 定义 | 示例 |
|------|------|------|
| submission | 提交者发布许可证供 OSI 审批 | "I am submitting the AI-MIT License 1.0 for OSI approval." |
| revision | 提交者发布新版/修订版 | "Attached is the revised version incorporating feedback." |
| withdrawal | 提交者本人撤回**许可证**（非撤回个人意见） | "I am withdrawing the submission to rework the license." |
| board_decision | License Committee / Board 的决定公告 | "The Board withholds approval of CAL 1.0 by a 7-0-0 vote." |
| feedback | 一般讨论/反馈（默认） | 第三方观点、问题、建议 |

**注意**：timeline 无 `vote` type。OSI board vote 发生在会议中，不在邮件列表。权威 vote 数据来自 `data/osi/minutes/*.md`（221 个 board meeting minutes），由 `findBoardVotes()` 提取到独立 `board_vote` 字段。

**分类优先级**：强信号（board_decision / withdrawal / revision）从 clean_body 检测，覆盖 curated type。其余用 curated 或 auto。

### Event type 分类防误判（2026-06-18 更新）

**问题根因**：原 `classifyEvent` 各类型正则只匹配**动词词组**，不看主语/宾语，导致：

| 误判 | 原因 | 示例 |
|------|------|------|
| `withdrawal` ← 撤回意见 | 动词 `withdraw` 无宾语约束 | toppers-license 的 cowan："I withdraw my **objection**"（撤反对意见，非撤许可证） |
| `withdrawal` ← 撤回观点 | 同上 | transitive-grace-period："I withdraw my [point]" |
| `submission` ← 批准公告 | `submitting this license for` 命中感谢语 | bsd-3-clause/bsd-open-mpi/wordnet 公告结尾 "Thank you for **submitting this license for** review" |
| `board_decision` 漏判 | `board+动词`要求紧邻，被动句动词与 board 被日期隔开 | "The … License **has been approved** in the July 18th **board meeting**" |

**修复**（`build-license-review-tracker.mjs` `classifyEvent`）——给每个类型的正则补主语/宾语约束：

- **withdrawal**：加 `WITHDRAW_OBJ`（要求宾语是 license/submission/proposal/beta/version 等许可证侧词）+ `WITHDRAW_NOT`（排除 objection/concern/comment/question/point/support/endorse 等意见侧词）。`review` 不在排除列（避免误伤 "license review committee"）。
- **submission**：加 `isAnnouncement` 守卫，命中感谢语 `thank you for submit/present/propos` 或被动公告 `has been approved` / `added to ... license list` 的跳过 submission。
- **board_decision**：补被动句模式（`has been approved ... board`、`approved ... board meeting`、`added to ... license list`），置于最高优先级。

**效果**：withdrawal 事件 4→2（仅 cal-1-0 撤 Beta3 换 Beta4、oin-license 撤 request 重开，其余回退 feedback）；bsd/wordnet 公告 → board_decision；board_decision 事件 22→27。

### ModelGo submission 漏判修复（2026-06-18 补充）

**问题**：ModelGo 首发 3 封（ModelGo Zero/Attribution-OpenSource/Attribution License v2.0，2025-02-12，Moming Duan）正文是 *"which I am submitting for OSI review"*，被判 `feedback` 而非 `submission`，导致 ModelGo timeline 头部缺 submission 节点。

**根因**（双重）：
1. submission 正则要求 `for\s+review`（for 与 review 紧邻），被 *"for OSI review"* 中的 `OSI` 隔开 → 不命中。
2. `classifyEvent` 顶部 `const b = cleanBodyText.toLowerCase()` 已把正文**全小写**，但正则字面量写的是大写 `OSI`——无 `i` flag 的正则区分大小写，大写 `OSI` 永远匹配不到小写化的 `osi`。

**修复**：
- `for\s+(?:OSI\s+)?review` → `for\s+(?:osi\s+|public\s+)?review`（小写化，b 已 toLowerCase）
- 新增模式 `\bi\s+(am\s+)?submit\w*\s+for\s+(?:osi\s+|public\s+)?review\b` 覆盖 *"I am submitting for OSI review"*

**⚠️ 通用陷阱**：`classifyEvent` 内 `b = toLowerCase()`，**所有正则字面量必须用小写**（已有 `OSI`/未来新增专有名词同理）。正则无 `i` flag 时大写字母在该函数内永远失配。

**效果**：ModelGo submission 事件 1→8（含首发三许可证 + 后续 resubmission）；全局 submission 事件 88→96。其余条目无回归（多 submission 的均为多轮提交许可证：3D-Slicer 6、License-Zero 4、mulan-v2 3、oin 3、cal-original 3、generic-attribution 3）。

### ModelGo 全量 point + opinion 风格修复（2026-06-18 补充）

**问题**：ModelGo merge cluster 扩展到 113 个事件后，只有 26 个有 LLM point，其余 87 个 fallback 到 clean body/snippet，导致 timeline 出现长正文、引用噪声、硬截断；后续 5.4-mini subagent 生成的部分 point 又采用第三人称开头（如 `He submits...`、`The email says...`），与 tracker 既有 opinion 风格不一致。

**处理流程**：
- 生成 `/tmp/llm-batches/batch-901..906.{in,out}.json`，共 87 条缺失事件，使用 5.4-mini worker 产出 `{id, clean, point_en, point_zh, sentiment}`；全部 JSON.parse 通过。
- `apply-llm-batches.mjs` 合并后：`all-points-manifest.json` 新增 87 条，ModelGo 113/113 事件均有 point。
- 修 `cleanBody.mergeWrappedHeaders()` 后，David Woolley 这类 `On ... wrote: > quoted` 噪声被剥离。
- 修 `enrich-license-tracker.mjs` point 优先级，防止旧 102 子集 `points-manifest.json` 覆盖 base 中的全量 ModelGo point。
- 规则化 ModelGo opinion 风格：去掉 `He/She/They`、`The email/message/sender/reviewer`、人名主语（`Pamela...`/`Josh...` 等），改为动词开头的简洁观点，如 `Submits...`、`Raises...`、`Argues...`、`Clarifies...`；中文同步去掉 `他/该邮件/发件人/审阅者/人名` 开头。

**当前校验**：
- ModelGo timeline：113 events，missing point=0。
- ModelGo opinion 风格：`bad_en=0`、`bad_zh=0`（无 `He...` / `The email...` / `他...` / `该邮件...` 等开头）。
- 全局 timeline：2930 events，missing point/snippet=0，引用噪声扫描=0。

### Participants 空 + 残留清洗（2026-06-18 补充）

**问题 1（Participants=0）**：64 个 submission 的 participants 为空，其中 44 个是有 timeline 但无参与者。根因：`messages.json` 只含 `license-review` 列表，而许多 approved 许可证（apache-2-0、bsl、cddl…）的 timeline 来自 2003-2008 年的 **license-discuss** 邮件，不在 messages.json 里 → `urlToSender` 查不到 → build 把 sender 写成 `Unknown` → enrich 第 558 行 `senderCounts` 跳过 Unknown → participants 空。

**修复**：`enrich-license-tracker.mjs` 顶部新增 `loadMdMessages()` 兜底——`.md` 月度归档解析两个列表都带 `from`，作为 `urlToSender` 的补充（仅当 messages.json 未提供时，保持 curated 数据权威）。修后 apache-2-0 的 sender 从全 `Unknown` 恢复为 `Roy T. Fielding`/`Eben Moglen` 等，participants 0→5；有 timeline 但 participants=0 的从 44 降到 0（剩余 20 个 participants=0 的是 timeline 也为空的纯 legacy，无数据属正常）。

**问题 2（引用噪声 + bad_zh 残留）**：codex 6 批次覆盖 ModelGo 87 条后，全局仍残留：14 条引用噪声（transitive-grace-period 11 条早期 LLM 把 `Argues that zooko wrote:` 引用 header 写进 point；oin/twente/000104 三条 clean_body 为空、整封是 `>` 引用块，snippet 回退露馅）+ 40 条 bad_zh（vaccine 22/unlicense 6/upl 5/unicode 4/modelgo 3，中文以 `他/她/发件人` 开头，与既有动词开头 opinion 风格不一致）+ 21 条 missing point_zh。

**修复**：手写 `/tmp/cleanup-overrides.json`（14 条引用噪声 + 40 条 bad_zh 中文重写 + 21 条 missing_zh，共 75 条精准 point_en/point_zh），经临时脚本注入 `all-points-manifest.json`（保留 sentiment/submitter_org）。重建后全局：引用噪声=0、bad_en=0、bad_zh=0、missing point_zh=0、有 timeline 但 participants=0=0。

**`.md` 归档作为 sender 兜底链**：现完整顺序为 `enrich.urlToSender`（messages.json license-review）→ `.md` archive `from`（两列表全覆盖）→ build 路径另有 mdFrom。 reject/withdrawn 路径的 mdFrom 兜底已存在，本次把 enrich 路径补齐。

### participants 里 submitter 缺失修复（2026-06-18 补充）

**问题**：87 个 submission 的 participants 没有 submitter role；59 条 submitter 名字根本不在 participants 列表。三类根因：

1. **名字变体**（28 条）：curated submitter 字段与 timeline sender 对同一人写法不同——`VanL` vs `Van Lindsay`、`Warner, Brian (TS3K)` vs `Brian Warner`、`Tobie Langel, URL N/A` vs `Tobie Langel`、`Ma, Philip` vs `Philip Ma`（姓前名后）、`yuko.noguchi at mhmjapan.com`（邮箱代名）。role 判定用严格字符串相等 → 失配。
2. **submitter 未发言**（27 条）：历史真实，submitter 没在列表发帖，participants 只从 timeline sender 去重 → submitter 不在列表（如 vaccine 的 Travis Hance、cal-original 的 Van Lindsay）。
3. **占位符**（4 条）：submitter 名是 `third-party submitter` / `unknown`（webm、beer-ware、qmail），无真实人名。

**修复**（`enrich-license-tracker.mjs` participants 构建段）：

- 新增 `normName()`/`canonicalName()`：剥离 `, URL N/A`、`<email>`、尾空格、`姓, 名`→`名 姓`，归一小写。role 判定改为 `name === submitterName || canonicalName(name) === canonicalName(submitterName)`，覆盖变体。
- **submitter 兜底注入**：若规范化后 submitter 仍未在 participants（即未发言），以 `message_count: 0, role: 'submitter'` 注入列表头部；占位符名（`/^(unknown|third-party submitter|anonymous)$/i`）跳过。
- submitter 显示名也用 `normName` 净化（去 `, URL N/A`、尾空格）。

**效果**：无 submitter role 的真实条目 87→0；38 个 silent submitter 注入（count=0）；32 个占位符合理跳过。变体类（`Warner, Brian`/`Ma, Philip`）规范化命中后保留真实发帖署名 + count。

**UI 联动**：`renderCard` 的 strip 用 `participants`（含 role）建 sender→role 映射，给 board member 节点打 `data-board`，tooltip 显示 `· Board Member`；submitter 节点（含变体匹配）显示 `· Submitter`。

### submitter 名填成许可证名修复（2026-06-18 补充）

**问题**：OSI API 的 `submitter_name` 字段偶尔不是人名，而是**许可证名本身**。`build-license-review-tracker.mjs` 处理 approved 许可证时 submitter 直接取该字段（`apiLicense.submitter_name || extractSender(...)`），非空即不走 fallback → 假名一路传到 v2，真实提交者反以 reviewer 身份出现在 participants。

**根因**：3 个许可证的 OSI API `submitter_name` 被污染：

| id | API submitter_name（脏） | 真实提交者（timeline 首个 submission sender） |
|----|--------------------------|-----------------------------------------------|
| ms-pl | `Microsoft Public License (Ms-PL)` | Jon Rosenberg (PBM) |
| lgpl-3-0 | `GNU Lesser General Public License` | Chris DiBona |
| gpl-3-0 | `GNU GENERAL PUBLIC LICENSE` | Chris DiBona |

**修复**（`enrich-license-tracker.mjs` submitter 解析段）：在 `submitterNameRaw` 计算前加识别——把候选名与许可证自身的 name/spdx_id/id/aliases 去掉非字母数字后做**双向 include** 比对（`canon()`），命中即视为字段填了许可证名，回退到 timeline 首个 `submission` 事件的 sender。

- `≥10 字符`门槛避开短名（MIT、BSD）误伤；双向匹配（`a.includes(b) || b.includes(a)`）覆盖 "Microsoft Public License (Ms-PL)" vs "Microsoft Public License" 这类带括号后缀的情况。
- 不改源 `osi-api-licenses.json`（脏数据产物，同类污染不止一个），用 enrich 兜底，对未发现的同类字段污染一并生效。
- 修后 submitter 名经 `canonicalName` 变体匹配命中 participants 里真实发帖署名（如 `Jon Rosenberg (PBM)`），保留真实 count；org/role 仍从 pointsManifest 正确保留（Microsoft Corporation / Director）。

**效果**：ms-pl、lgpl-3-0、gpl-3-0 三个 submitter 从许可证名修正为真实人名；全局 3 个污染全部修复，169 个正常许可证 0 误伤。

## Vote outcome 推断（2026-06-16 更新）

**语义方向优先**：
- motion 含 `withhold(s)` / `did not approve` / `not approve` / `reject` / `decline` / `deny` → outcome=rejected
- motion 含 `approve(s)` / `approved` / `grants approval` 且无 reject 词 → outcome=approved
- 否则用 tally（yes > no → approved）
- 最后 fallback：OSI approved list membership

**版本/变体对齐**：对同一许可证族不同版本（如 CAL beta 4 vs Version 1.0），加版本 token 对齐（同版本 +40，冲突版本 -60），避免跨版本误配。另加 BSD `N-Clause` 数字冲突拒绝和 Original/Draft vs Beta motion 冲突拒绝，防止泛关键词把相邻许可证变体串在一起。

**验证**：
- Vaccine License motion "withholds approval" → outcome=rejected（正确）
- voted-pending 矛盾：0
- motion/outcome 语义矛盾：0（enrich 脚本 reject 词优先级正确）
- minutes-sourced board vote 串配审计：0（LiLiQ→Mulan、BSD-2/0BSD→BSD-1、PostgreSQL→LBNL BSD、CNRI-Python→SimPL 均已消除或回退到 OSI API/null）
