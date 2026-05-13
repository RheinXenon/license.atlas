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
