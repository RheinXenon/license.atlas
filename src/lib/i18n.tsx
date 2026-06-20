"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Lang = "en" | "zh";

const dict: Record<Lang, Record<string, string>> = {
  en: {
    // Navbar
    "nav.browse": "Home",
    "nav.about": "About",
    "nav.tracker": "License Review Tracker",
    "tracker.title": "License Review Tracker",
    "tracker.subtitlePre": "Track the license approval process at ",
    "tracker.subtitlePost": " — every license ever submitted for review, with the full mailing-list debate, community sentiment, and the final decision for each.",
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
    "tracker.voteRecordOnly": "Board decision recorded by OSI API.",
    "tracker.voteUnanimous": "Passed unanimously",
    "tracker.voteMajority": "Passed by majority",
    "tracker.voteExactCountsNotRecorded": "Exact counts not recorded",
    "tracker.minutes": "Board Meeting Minutes",
    "tracker.status-approved": "Approved",
    "tracker.status-rejected": "Rejected",
    "tracker.status-pending": "Pending",
    "tracker.status-withdrawn": "Withdrawn",
    "tracker.status-superseded": "Superseded",
    "tracker.status-legacy": "Legacy",
    "review.title": "License Review Status from OSI",
    "review.subtitle": "This license went through the OSI board review process.",
    "review.latest": "Latest event",
    "review.firstSubmitted": "First Submitted",
    "review.approvedDate": "Approved Date",
    "review.rejectedDate": "Rejected Date",
    "tag.review-tracked": "Review Tracked",

    // Home
    "home.subtitle": "A comprehensive collection of {total} software, AI model, data, and agent licenses.",
    "home.search": "Search licenses...",
    "home.showing": "Showing {shown} of {total} licenses",
    "home.noResults": "No licenses found.",
    "home.loadMore": "Load More ({remaining} remaining)",
    "home.latest": "Latest",
    "home.clear": "Clear",
    "home.allLanguages": "All Languages",
    "home.aboutLink": "About",

    // Type pills
    "type.software": "Software",
    "type.model": "Model",
    "type.data": "Data",
    "type.agent": "Agent",
    "type.terms": "Terms",

    // Tag pills
    "tag.proprietary": "Proprietary",
    "tag.custom": "Custom",
    "tag.huggingface": "HuggingFace",
    "tag.tldrlegal-verified": "tl;drLegal Verified",
    "tag.creative-commons": "Creative Commons",
    "tag.copyleft": "Copyleft",
    "tag.permissive": "Permissive",
    "tag.gnu-nonfree": "GNU Nonfree",
    "tag.weak-copyleft": "Weak Copyleft",
    "tag.mcp-server": "MCP Server",
    "tag.gnu": "GNU",
    "tag.modelgo": "ModelGo",
    "tag.public-domain": "Public Domain",
    "tag.terms": "Terms",
    "tag.agent-framework": "Agent Framework",
    "tag.agent-skill": "Agent Skill",
    "tag.llm-tool": "LLM Tool",
    "tag.hardware": "Hardware",
    "tag.gpl-2-compatible": "GPLv2 Compatible",
    "tag.gpl-3-compatible": "GPLv3 Compatible",
    "tag.fdl-compatible": "GFDL Compatible",

    // Tag descriptions
    "tagdesc.software": "Software license governing source code usage, modification, and distribution",
    "tagdesc.model": "AI model license for machine learning weights and parameters",
    "tagdesc.data": "Data license governing dataset usage and redistribution",
    "tagdesc.agent": "License for AI agent tools — MCP servers, agent frameworks, skills, and LLM integrations",
    "tagdesc.osi": "Approved by the Open Source Initiative as meeting the Open Source Definition",
    "tagdesc.fsf": "Classified as a free license by the Free Software Foundation",
    "tagdesc.review-tracked": "Has a public license review record, including submissions, discussions, votes, or final decisions.",
    "tagdesc.proprietary": "Proprietary license that restricts one or more fundamental usage rights",
    "tagdesc.custom": "Custom license not registered with SPDX or other standard bodies",
    "tagdesc.huggingface": "License found on a HuggingFace Hub model",
    "tagdesc.tldrlegal-verified": "Verified by tl;drLegal — license summary reviewed for accuracy",
    "tagdesc.creative-commons": "A license from the Creative Commons framework for sharing creative works",
    "tagdesc.copyleft": "Derivative works must be distributed under the same or compatible license terms",
    "tagdesc.permissive": "Minimal restrictions on how the licensed work can be used, modified, and redistributed",
    "tagdesc.gnu-nonfree": "Classified as non-free by the GNU Project / Free Software Foundation",
    "tagdesc.weak-copyleft": "Copyleft applies to the original work but not necessarily to larger combined works",
    "tagdesc.mcp-server": "License from an MCP (Model Context Protocol) server project",
    "tagdesc.gnu": "A license from the GNU Project (Free Software Foundation)",
    "tagdesc.modelgo": "A license from the ModelGo framework — CC-style licenses designed for AI models",
    "tagdesc.public-domain": "Not protected by intellectual property rights — free for anyone to use",
    "tagdesc.agent-framework": "License from an AI agent framework project",
    "tagdesc.agent-skill": "License from an AI agent skill/plugin project",
    "tagdesc.llm-tool": "License from an LLM tool integration project",
    "tagdesc.hardware": "License for open hardware designs, circuits, and physical artifacts",
    "tagdesc.bo-model": "The model license demonstrates all the characteristics the council looks for in a permissive open software license.",
    "tagdesc.bo-gold": "These licenses address patents explicitly, use robust language, and require only simple notice of license terms and copyright notices.",
    "tagdesc.bo-silver": "These licenses use robust language but either fail to address patents explicitly or require more than simple notice of license terms and copyright notices.",
    "tagdesc.bo-bronze": "These licenses lack important but nonessential elements of permissive open software licenses or impose additional requirements or restrictions, such as BSD-style prohibitions against endorsement and promotion.",
    "tagdesc.bo-lead": "These licenses lack one or more essential elements of permissive open software licenses or impose unusually burdensome requirements. Many use unclear, jocular, or incomplete language.",

    // Filters
    "filter.proprietary": "Proprietary",

    // Language filter options
    "lang.all": "All Languages",
    "lang.zh": "Chinese",
    "lang.ja": "Japanese",
    "lang.ko": "Korean",
    "lang.ar": "Arabic",

    // License card badges
    "badge.osiApproved": "OSI Approved",
    "badge.fsfLibre": "FSF Libre",

    // License detail
    "detail.allLicenses": "All Licenses",
    "detail.sources": "Sources",
    "detail.terms": "Related Terms",
    "detail.permissions": "Permissions",
    "detail.conditions": "Conditions",
    "detail.limitations": "Limitations",
    "perm.commercial-use": "Commercial Use",
    "perm.distribution": "Distribution",
    "perm.modifications": "Modifications",
    "perm.patent-use": "Patent Use",
    "perm.private-use": "Private Use",
    "perm.sublicense": "Sublicense",
    "cond.include-copyright": "Include Copyright",
    "cond.include-license": "Include License",
    "cond.document-changes": "Document Changes",
    "cond.disclose-source": "Disclose Source",
    "cond.same-license": "Same License",
    "cond.same-license--library": "Same License (Library)",
    "cond.network-use-disclose": "Network Use Disclose",
    "limit.liability": "Liability",
    "limit.warranty": "Warranty",
    "limit.commercial-use": "Commercial Use",
    "limit.modifications": "Modifications",
    "limit.trademark-use": "Trademark Use",
    "detail.reportIssue": "Report an Issue",
    "detail.added": "Added {date}",
    "detail.blueOakRating": "Blue Oak Rating",
    "detail.blueOak.model": "Ideal permissive license",
    "detail.blueOak.gold": "Explicit patent terms, robust language, simple notice",
    "detail.blueOak.silver": "Robust language, may lack patent terms",
    "detail.blueOak.bronze": "Missing nonessential elements or extra restrictions",
    "detail.blueOak.lead": "Missing essential elements or burdensome requirements",
    "bo.model": "Model",
    "bo.gold": "Gold",
    "bo.silver": "Silver",
    "bo.bronze": "Bronze",
    "bo.lead": "Lead",

    // License body
    "body.fullText": "Full Text",
    "body.copy": "Copy",
    "body.copied": "Copied",
    "body.copyTooltip": "Copy license text",
    "body.language": "Language",

    // Browse page
    "browse.title": "Browse Licenses",
    "browse.count": "{filtered} of {total} licenses",
    "browse.search": "Search by name or SPDX ID...",
    "browse.allTypes": "All Types",
    "browse.allTags": "All Tags",
    "browse.noResults": "No licenses found matching your criteria.",
    "browse.loadMore": "Load More ({remaining} remaining)",

    // Footer
    "footer.dataUpdatedAt": "Latest Data Update: {date}",
    "footer.views": "views",
    "footer.visitors": "visitors",

    // About
    "about.title": "About LicenseAtlas",
    "about.intro": "LicenseAtlas is the most comprehensive collection of software, AI model, data, agent, and terms licenses — covering {total} licenses across five categories. Our goal is to provide a single, searchable reference for every license you might encounter in modern software and AI development.",
    "about.stats.software": "Software",
    "about.stats.model": "AI Model",
    "about.stats.data": "Data",
    "about.stats.agent": "Agent",
    "about.stats.terms": "Terms",
    "about.sourcesTitle": "License Text Sources",
    "about.sourcesIntro": "License data is aggregated from the following authoritative sources:",
    "about.src.spdx": "Software Package Data Exchange license list",
    "about.src.osi": "Open Source Initiative approved licenses",
    "about.src.tldrlegal": "Software licenses explained in plain English",
    "about.src.choosealicense": "GitHub's license selection guide",
    "about.src.github": "Custom licenses from agent skills, MCP servers, and open-source tools",
    "about.src.huggingface": "AI model and dataset licenses, including custom and gated model agreements",
    "about.src.odc": "Data licenses and dedications",
    "about.src.fsf": "Free Software Foundation libre evaluations and GNU license list",
    "about.src.cc": "CC license official texts",
    "about.src.rail": "Responsible AI licenses",
    "about.src.openatom": "Model and hardware licenses maintained by OpenAtom Foundation (bilingual CN/EN)",
    "about.src.scancode": "1,800+ custom license texts from ScanCode LicenseDB (CC-BY-4.0). Permissive, copyleft, proprietary-free, and source-available licenses.",
    "about.src.blueoak": "Quality ratings for 225+ permissive licenses (Model/Gold/Silver/Bronze/Lead)",
    "about.src.openmdw": "Permissive open-source license for machine-learning models and related artifacts, by Linux Foundation",
    "about.src.osiTracker": "Compiled from OSI's public license API, license-review/license-discuss mailing-list archives, and OSI board meeting minutes",
    "about.reviewTitle": "OSI License Review Tracker",
    "about.reviewIntro": "The review tracker covers {total} OSI license submissions, including {approved} approved, {rejected} rejected, and {pending} pending reviews, with discussion timelines and board-vote records where available. Original records come from OSI's public license API, OSI mailing-list archives, and OSI board meeting minutes; LicenseAtlas compiles, normalizes, and presents those public records.",
    "about.popTitle": "Popularity & Trends",
    "about.popIntro": "Popularity scores and trend charts are generated from real-world usage data across three major platforms:",
    "about.pop.hf": "2.8M+ models and 927K+ datasets",
    "about.pop.gh": "Repository counts across 28 license types",
    "about.pop.kg": "714K+ datasets via Meta-Kaggle",
    "about.popNote": "Trend charts show monthly adoption rates for the most popular licenses, based on HuggingFace model creation data over the past 12 months.",
    "about.roadmapTitle": "Roadmap",
    "about.roadmap.compare": "License comparison tool",
    "about.roadmap.guides": "License interpretation guides",
    "about.createdBy": "A project by",
    "about.scholarAlt": "Google Scholar",
    "about.poweredBy": "Powered by",

    // Search groups
    "search.group.name": "Name Match",
    "search.group.source": "Source Match",
    "search.group.fulltext": "Full-text Match",
    "search.group.fuzzy": "Fuzzy Match",
    "search.loading": "Loading search index…",
    "search.placeholder": "Search name, source, or full text…",

    // Lang toggle
    "lang.switchTo": "中文",
  },
  zh: {
    // Navbar
    "nav.browse": "首页",
    "nav.about": "关于",
    "nav.tracker": "许可证审查追踪器",
    "tracker.title": "许可证审查追踪器",
    "tracker.subtitlePre": "追踪 ",
    "tracker.subtitlePost": " 的许可证审批全过程 —— 每一个提交审查的许可证，连同完整的邮件列表讨论、社区态度，以及各自的最终决议。",
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
    "tracker.voteRecordOnly": "OSI API 记录的董事会决议。",
    "tracker.voteUnanimous": "一致通过",
    "tracker.voteMajority": "多数通过",
    "tracker.voteExactCountsNotRecorded": "未记录具体票数",
    "tracker.minutes": "董事会会议纪要",
    "tracker.status-approved": "已批准",
    "tracker.status-rejected": "已否决",
    "tracker.status-pending": "待定",
    "tracker.status-withdrawn": "已撤回",
    "tracker.status-superseded": "已取代",
    "tracker.status-legacy": "传统",
    "review.title": "来自 OSI 的许可证审查状态",
    "review.subtitle": "该许可证经过了 OSI 董事会审查流程。",
    "review.latest": "最新事件",
    "review.firstSubmitted": "首次提交",
    "review.approvedDate": "批准日期",
    "review.rejectedDate": "否决日期",
    "tag.review-tracked": "审查记录",

    // Home
    "home.subtitle": "涵盖 {total} 个软件、AI 模型、数据和智能体许可证的全面集合。",
    "home.search": "搜索许可证...",
    "home.showing": "显示 {shown} / {total} 个许可证",
    "home.noResults": "未找到许可证。",
    "home.loadMore": "加载更多（剩余 {remaining} 个）",
    "home.latest": "最新",
    "home.clear": "清除",
    "home.allLanguages": "所有语言",
    "home.aboutLink": "关于",

    // Type pills
    "type.software": "软件",
    "type.model": "模型",
    "type.data": "数据",
    "type.agent": "智能体",
    "type.terms": "服务条款",

    // Tag pills
    "tag.proprietary": "专有",
    "tag.custom": "自定义",
    "tag.huggingface": "HuggingFace",
    "tag.tldrlegal-verified": "tl;drLegal 验证",
    "tag.creative-commons": "知识共享",
    "tag.copyleft": "Copyleft",
    "tag.permissive": "宽松许可",
    "tag.gnu-nonfree": "GNU 非自由",
    "tag.weak-copyleft": "弱 Copyleft",
    "tag.mcp-server": "MCP 服务器",
    "tag.gnu": "GNU",
    "tag.modelgo": "ModelGo",
    "tag.public-domain": "公共领域",
    "tag.terms": "服务条款",
    "tag.agent-framework": "智能体框架",
    "tag.agent-skill": "智能体技能",
    "tag.llm-tool": "LLM 工具",
    "tag.hardware": "硬件",
    "tag.gpl-2-compatible": "GPLv2 兼容",
    "tag.gpl-3-compatible": "GPLv3 兼容",
    "tag.fdl-compatible": "GFDL 兼容",

    // Tag descriptions
    "tagdesc.software": "管理源代码使用、修改和分发的软件许可证",
    "tagdesc.model": "管理机器学习权重和参数的 AI 模型许可证",
    "tagdesc.data": "管理数据集使用和再分发的数据许可证",
    "tagdesc.agent": "AI 智能体工具许可证 — MCP 服务器、智能体框架、技能和 LLM 集成",
    "tagdesc.osi": "经开放源代码促进会（OSI）批准，符合开源定义",
    "tagdesc.fsf": "被自由软件基金会（FSF）归类为自由许可证",
    "tagdesc.review-tracked": "有公开的许可证审查记录，可能包含提交、讨论、投票或最终决议。",
    "tagdesc.proprietary": "限制一个或多个基本使用权利的专有许可证",
    "tagdesc.custom": "未在 SPDX 或其他标准机构注册的自定义许可证",
    "tagdesc.huggingface": "来自 HuggingFace Hub 模型的许可证",
    "tagdesc.tldrlegal-verified": "经 tl;drLegal 验证 — 许可证摘要已审核",
    "tagdesc.creative-commons": "来自知识共享框架的创意作品共享许可证",
    "tagdesc.copyleft": "衍生作品必须在相同或兼容的许可证条款下分发",
    "tagdesc.permissive": "对许可作品的使用、修改和再分发限制最少",
    "tagdesc.gnu-nonfree": "被 GNU 项目 / 自由软件基金会归类为非自由",
    "tagdesc.weak-copyleft": "Copyleft 适用于原始作品，但不一定适用于更大的组合作品",
    "tagdesc.mcp-server": "来自 MCP（模型上下文协议）服务器项目的许可证",
    "tagdesc.gnu": "来自 GNU 项目（自由软件基金会）的许可证",
    "tagdesc.modelgo": "来自 ModelGo 框架的许可证 — 专为 AI 模型设计的 CC 风格许可证",
    "tagdesc.public-domain": "不受知识产权保护 — 任何人都可以自由使用",
    "tagdesc.agent-framework": "来自 AI 智能体框架项目的许可证",
    "tagdesc.agent-skill": "来自 AI 智能体技能/插件项目的许可证",
    "tagdesc.llm-tool": "来自 LLM 工具集成项目的许可证",
    "tagdesc.hardware": "管理开源硬件设计、电路和物理制品的许可证",
    "tagdesc.terms": "被许可证正文引用的服务条款文档",
    "tagdesc.gpl-2-compatible": "经自由软件基金会认定与 GPLv2 兼容",
    "tagdesc.gpl-3-compatible": "经自由软件基金会认定与 GPLv3 兼容",
    "tagdesc.fdl-compatible": "经自由软件基金会认定与 GFDL 兼容",
    "tagdesc.bo-model": "模板许可证展示了委员会所期望的宽松开源许可证的全部特征。",
    "tagdesc.bo-gold": "这些许可证明确处理专利问题，使用严谨的语言，仅需简单的许可条款和版权声明。",
    "tagdesc.bo-silver": "这些许可证使用严谨的语言，但未能明确处理专利问题，或要求超出简单的许可条款和版权声明。",
    "tagdesc.bo-bronze": "这些许可证缺少宽松开源许可证的重要但非必要元素，或施加额外要求和限制，例如 BSD 风格的禁止背书和推广条款。",
    "tagdesc.bo-lead": "这些许可证缺少宽松开源许可证的一个或多个必要元素，或施加异常繁重的要求。许多许可证使用了不清晰、戏谑或不完整的语言。",

    // Filters
    "filter.proprietary": "专有",

    // Language filter options
    "lang.all": "所有语言",
    "lang.zh": "中文",
    "lang.ja": "日语",
    "lang.ko": "韩语",
    "lang.ar": "阿拉伯语",

    // License card badges
    "badge.osiApproved": "OSI 认证",
    "badge.fsfLibre": "FSF 自由",

    // License detail
    "detail.allLicenses": "所有许可证",
    "detail.sources": "来源",
    "detail.terms": "相关条款",
    "detail.permissions": "权限",
    "detail.conditions": "条件",
    "detail.limitations": "限制",
    "perm.commercial-use": "商业使用",
    "perm.distribution": "分发",
    "perm.modifications": "修改",
    "perm.patent-use": "专利使用",
    "perm.private-use": "私人使用",
    "perm.sublicense": "再许可",
    "cond.include-copyright": "保留版权声明",
    "cond.include-license": "保留许可副本",
    "cond.document-changes": "记录变更",
    "cond.disclose-source": "公开源代码",
    "cond.same-license": "相同许可",
    "cond.same-license--library": "相同许可（库）",
    "cond.network-use-disclose": "网络使用公开",
    "limit.liability": "责任",
    "limit.warranty": "担保",
    "limit.commercial-use": "商业使用",
    "limit.modifications": "修改",
    "limit.trademark-use": "商标使用",
    "detail.reportIssue": "反馈问题",
    "detail.added": "添加于 {date}",
    "detail.blueOakRating": "Blue Oak 评级",
    "detail.blueOak.model": "理想的宽松许可证",
    "detail.blueOak.gold": "明确处理专利，语言严谨，仅需简单声明",
    "detail.blueOak.silver": "语言严谨，但可能缺少专利条款",
    "detail.blueOak.bronze": "缺少非必要元素或有额外限制",
    "detail.blueOak.lead": "缺少必要元素或要求过于繁琐",
    "bo.model": "模板",
    "bo.gold": "金级",
    "bo.silver": "银级",
    "bo.bronze": "铜级",
    "bo.lead": "铅级",

    // License body
    "body.fullText": "全文",
    "body.copy": "复制",
    "body.copied": "已复制",
    "body.copyTooltip": "复制许可证文本",
    "body.language": "语言",

    // Browse page
    "browse.title": "浏览许可证",
    "browse.count": "{filtered} / {total} 个许可证",
    "browse.search": "按名称或 SPDX ID 搜索...",
    "browse.allTypes": "所有类型",
    "browse.allTags": "所有标签",
    "browse.noResults": "未找到符合条件的许可证。",
    "browse.loadMore": "加载更多（剩余 {remaining} 个）",

    // Footer
    "footer.dataUpdatedAt": "最新数据更新时间：{date}",
    "footer.views": "次浏览",
    "footer.visitors": "位访客",

    // About
    "about.title": "关于许可图鉴（LicenseAtlas）",
    "about.intro": "许可图鉴（LicenseAtlas）是最全面的软件、AI 模型、数据、智能体和服务条款许可证集合——涵盖 {total} 个许可证，分为五大类别。我们的目标是为现代软件和 AI 开发中可能遇到的每一个许可证提供统一的可搜索参考。",
    "about.stats.software": "软件",
    "about.stats.model": "AI 模型",
    "about.stats.data": "数据",
    "about.stats.agent": "智能体",
    "about.stats.terms": "服务条款",
    "about.sourcesTitle": "许可证原文来源",
    "about.sourcesIntro": "许可证数据聚合自以下权威来源：",
    "about.src.spdx": "Software Package Data Exchange 许可证列表",
    "about.src.osi": "Open Source Initiative 批准的许可证",
    "about.src.tldrlegal": "用通俗语言解释的软件许可证",
    "about.src.choosealicense": "GitHub 的许可证选择指南",
    "about.src.github": "来自 Agent 技能、MCP 服务器和开源工具的自定义许可证",
    "about.src.huggingface": "AI 模型与数据集许可证，包括自定义和 Gated 模型协议",
    "about.src.odc": "数据许可证与公共领域声明",
    "about.src.fsf": "自由软件基金会自由许可证评估及 GNU 许可证列表",
    "about.src.cc": "CC 许可证官方文本",
    "about.src.rail": "负责任 AI 许可证",
    "about.src.openatom": "开放原子开源基金会维护的模型与硬件许可证（中英双语）",
    "about.src.scancode": "来自 ScanCode LicenseDB 的 1800+ 自定义许可证全文 (CC-BY-4.0)。包括宽松、Copyleft、专有免费和源码可用许可证。",
    "about.src.blueoak": "225+ 宽松许可证的质量评级（Model/Gold/Silver/Bronze/Lead）",
    "about.src.openmdw": "由 Linux Foundation 发布的 AI 模型及关联制品宽松开源许可证",
    "about.src.osiTracker": "整理自 OSI 公开许可证 API、license-review/license-discuss 邮件列表归档与 OSI 董事会会议纪要",
    "about.reviewTitle": "OSI 许可证审查追踪器",
    "about.reviewIntro": "审查追踪器覆盖 {total} 个 OSI 许可证提交，包括 {approved} 个已批准、{rejected} 个已否决、{pending} 个待定审查，并在可用时提供讨论时间线与董事会投票记录。原始记录来自 OSI 公开许可证 API、OSI 邮件列表归档和 OSI 董事会会议纪要；LicenseAtlas 只对这些公开记录进行整理、规范化和展示。",
    "about.popTitle": "热度与趋势",
    "about.popIntro": "热度评分和趋势图表基于以下三大平台的真实使用数据生成：",
    "about.pop.hf": "280 万+ 模型和 92.7 万+ 数据集",
    "about.pop.gh": "28 种许可证类型的仓库数量",
    "about.pop.kg": "通过 Meta-Kaggle 覆盖 71.4 万+ 数据集",
    "about.popNote": "趋势图表展示热门许可证的月度采用率，数据来源于 HuggingFace 模型创建记录（近 12 个月）。",
    "about.roadmapTitle": "路线图",
    "about.roadmap.compare": "许可证对比工具",
    "about.roadmap.guides": "许可证解读指南",
    "about.createdBy": "项目来自",
    "about.scholarAlt": "Google Scholar",
    "about.poweredBy": "Powered by",

    // Search groups
    "search.group.name": "名称匹配",
    "search.group.source": "来源匹配",
    "search.group.fulltext": "全文匹配",
    "search.group.fuzzy": "模糊匹配",
    "search.loading": "正在加载搜索索引…",
    "search.placeholder": "搜索名称、来源或全文…",

    // Lang toggle
    "lang.switchTo": "English",
  },
};

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("lang") as Lang | null;
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language.startsWith("zh") ? "zh" : "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  // Keep the server render and the first client render identical. Reading
  // localStorage/navigator during the initial client render can switch text
  // from "Home" to "首页" before hydration completes.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let val = dict[lang]?.[key] ?? dict.en[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          val = val.replace(`{${k}}`, String(v));
        }
      }
      return val;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
