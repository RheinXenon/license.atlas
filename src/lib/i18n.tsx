"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Lang = "en" | "zh";

const dict: Record<Lang, Record<string, string>> = {
  en: {
    // Navbar
    "nav.browse": "Home",
    "nav.about": "About",

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
    "tag.agent-framework": "Agent Framework",
    "tag.agent-skill": "Agent Skill",
    "tag.llm-tool": "LLM Tool",
    "tag.hardware": "Hardware",

    // Tag descriptions
    "tagdesc.software": "Software license governing source code usage, modification, and distribution",
    "tagdesc.model": "AI model license for machine learning weights and parameters",
    "tagdesc.data": "Data license governing dataset usage and redistribution",
    "tagdesc.agent": "License for AI agent tools — MCP servers, agent frameworks, skills, and LLM integrations",
    "tagdesc.osi": "Approved by the Open Source Initiative as meeting the Open Source Definition",
    "tagdesc.fsf": "Classified as a free license by the Free Software Foundation",
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
    "detail.permissions": "Permissions",
    "detail.conditions": "Conditions",
    "detail.limitations": "Limitations",
    "detail.added": "Added {date}",

    // Browse page
    "browse.title": "Browse Licenses",
    "browse.count": "{filtered} of {total} licenses",
    "browse.search": "Search by name or SPDX ID...",
    "browse.allTypes": "All Types",
    "browse.allTags": "All Tags",
    "browse.noResults": "No licenses found matching your criteria.",
    "browse.loadMore": "Load More ({remaining} remaining)",

    // Footer
    "footer.views": "views",
    "footer.visitors": "visitors",

    // About
    "about.title": "About LicenseAtlas",
    "about.intro": "LicenseAtlas is the most comprehensive collection of software, AI model, data, and agent licenses — covering {total} licenses across four categories. Our goal is to provide a single, searchable reference for every license you might encounter in modern software and AI development.",
    "about.stats.software": "Software",
    "about.stats.model": "AI Model",
    "about.stats.data": "Data",
    "about.stats.agent": "Agent",
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

    // Tag pills
    "tag.proprietary": "专有",
    "tag.custom": "自定义",
    "tag.huggingface": "HuggingFace",
    "tag.tldrlegal-verified": "tl;drLegal 已验证",
    "tag.creative-commons": "知识共享",
    "tag.copyleft": "Copyleft",
    "tag.permissive": "宽松许可",
    "tag.gnu-nonfree": "GNU 非自由",
    "tag.weak-copyleft": "弱 Copyleft",
    "tag.mcp-server": "MCP 服务器",
    "tag.gnu": "GNU",
    "tag.modelgo": "ModelGo",
    "tag.public-domain": "公共领域",
    "tag.agent-framework": "智能体框架",
    "tag.agent-skill": "智能体技能",
    "tag.llm-tool": "LLM 工具",
    "tag.hardware": "硬件",

    // Tag descriptions
    "tagdesc.software": "管理源代码使用、修改和分发的软件许可证",
    "tagdesc.model": "管理机器学习权重和参数的 AI 模型许可证",
    "tagdesc.data": "管理数据集使用和再分发的数据许可证",
    "tagdesc.agent": "AI 智能体工具许可证 — MCP 服务器、智能体框架、技能和 LLM 集成",
    "tagdesc.osi": "经开放源代码促进会（OSI）批准，符合开源定义",
    "tagdesc.fsf": "被自由软件基金会（FSF）归类为自由许可证",
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
    "detail.permissions": "权限",
    "detail.conditions": "条件",
    "detail.limitations": "限制",
    "detail.added": "添加于 {date}",

    // Browse page
    "browse.title": "浏览许可证",
    "browse.count": "{filtered} / {total} 个许可证",
    "browse.search": "按名称或 SPDX ID 搜索...",
    "browse.allTypes": "所有类型",
    "browse.allTags": "所有标签",
    "browse.noResults": "未找到符合条件的许可证。",
    "browse.loadMore": "加载更多（剩余 {remaining} 个）",

    // Footer
    "footer.views": "次浏览",
    "footer.visitors": "位访客",

    // About
    "about.title": "关于 LicenseAtlas",
    "about.intro": "LicenseAtlas 是最全面的软件、AI 模型、数据和智能体许可证集合——涵盖 {total} 个许可证，分为四大类别。我们的目标是为现代软件和 AI 开发中可能遇到的每一个许可证提供统一的可搜索参考。",
    "about.stats.software": "软件",
    "about.stats.model": "AI 模型",
    "about.stats.data": "数据",
    "about.stats.agent": "智能体",
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
  const [lang, setLangState] = useState<Lang>(detectLang);

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
