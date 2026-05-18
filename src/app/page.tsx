"use client";

import { Suspense, useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LicenseCard } from "@/components/license-card";
import { themes } from "@/components/badge";
import { useLang } from "@/lib/i18n";
import { searchLicenses, preloadIndex } from "@/lib/search";
import type { SearchGroup } from "@/lib/search";
import licenses from "@/data/licenses-index.json";
import stats from "@/data/stats.json";
import type { License } from "@/lib/types";

const PAGE_SIZE = 30;
const allLicenses = licenses as License[];
const allTags = Array.from(
  new Set(allLicenses.flatMap((l) => l.tags))
).filter((t) => !["MCP Server", "Agent Framework", "Agent Skill", "LLM Tool", "Proprietary"].includes(t));

const tagOrder = ["Public Domain", "Permissive", "Weak Copyleft", "Copyleft", "Creative Commons", "GNU", "ModelGo", "GNU Nonfree", "Hardware", "Custom", "HuggingFace", "MCP Server", "Agent Framework", "Agent Skill", "LLM Tool", "Terms", "tl;drLegal Verified"];
allTags.sort((a, b) => {
  const ai = tagOrder.indexOf(a), bi = tagOrder.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
});

export default function HomePage() {
  return <Suspense><HomeContent /></Suspense>;
}

function HomeContent() {
  const sp = useSearchParams();
  const { t } = useLang();

  const [query, setQuery] = useState(sp.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState(sp.get("type") ?? "");
  const [osionly, setOsiOnly] = useState(sp.get("osi") === "1");
  const [fsfOnly, setFsfOnly] = useState(sp.get("fsf") === "1");
  const [propOnly, setPropOnly] = useState(sp.get("prop") === "1");
  const [langFilter, setLangFilter] = useState(sp.get("lang") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "");
  const [tagFilter, setTagFilter] = useState<Set<string>>(() => {
    const t = sp.get("tags");
    return t ? new Set(t.split(",")) : new Set();
  });
  const [page, setPage] = useState(0);

  // Full-text search state
  const [searchGroups, setSearchGroups] = useState<SearchGroup[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (typeFilter) p.set("type", typeFilter);
    if (osionly) p.set("osi", "1");
    if (fsfOnly) p.set("fsf", "1");
    if (propOnly) p.set("prop", "1");
    if (langFilter) p.set("lang", langFilter);
    if (tagFilter.size > 0) p.set("tags", [...tagFilter].join(","));
    if (sort) p.set("sort", sort);
    const search = p.toString();
    const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [query, typeFilter, osionly, fsfOnly, propOnly, langFilter, tagFilter, sort]);

  // Debounced full-text search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setSearchGroups(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      searchLicenses(query).then((groups) => {
        setSearchGroups(groups);
        setSearchLoading(false);
      }).catch(() => {
        setSearchGroups([]);
        setSearchLoading(false);
      });
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // slug → popularity lookup
  const popularityMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of allLicenses) {
      if (l.popularity != null) m.set(l.slug, l.popularity);
    }
    return m;
  }, []);

  // Apply filters + sort by popularity to search results
  const filteredGroups = useMemo(() => {
    if (!searchGroups) return null;
    return searchGroups.map((g) => {
      let results = g.results;
      if (typeFilter) results = results.filter((r) => r.type === typeFilter);
      if (propOnly) {
        results = results.filter((r) => {
          const l = allLicenses.find((lic) => lic.slug === r.slug);
          return l?.proprietary;
        });
      } else {
        if (osionly) results = results.filter((r) => {
          const l = allLicenses.find((lic) => lic.slug === r.slug);
          return l?.osi_approved;
        });
        if (fsfOnly) results = results.filter((r) => {
          const l = allLicenses.find((lic) => lic.slug === r.slug);
          return l?.fsf_libre;
        });
      }
      if (tagFilter.size > 0) results = results.filter((r) => {
        const l = allLicenses.find((lic) => lic.slug === r.slug);
        return l && [...tagFilter].every((tag) => l.tags.includes(tag));
      });
      if (langFilter) results = results.filter((r) => {
        const l = allLicenses.find((lic) => lic.slug === r.slug);
        return l?.languages?.some((lang) => lang === langFilter || lang.startsWith(langFilter));
      });
      results.sort((a, b) => (popularityMap.get(b.slug) ?? 0) - (popularityMap.get(a.slug) ?? 0));
      return { ...g, results };
    }).filter((g) => g.results.length > 0);
  }, [searchGroups, typeFilter, osionly, fsfOnly, propOnly, tagFilter, langFilter]);

  // Original filter logic (non-search mode)
  const filtered = useMemo(() => {
    if (searchGroups !== null) return []; // search mode handles its own results
    let result = allLicenses;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.spdx_id.toLowerCase().includes(q)
      );
    }
    if (typeFilter) result = result.filter((l) => l.type === typeFilter);
    if (propOnly) {
      result = result.filter((l) => l.proprietary);
    } else {
      if (osionly) result = result.filter((l) => l.osi_approved);
      if (fsfOnly) result = result.filter((l) => l.fsf_libre);
    }
    if (tagFilter.size > 0) result = result.filter((l) => [...tagFilter].every((t) => l.tags.includes(t)));
    if (langFilter) result = result.filter((l) => l.languages?.some((lang) => lang === langFilter || lang.startsWith(langFilter)));
    if (sort === "newest") result = [...result].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    return result;
  }, [query, typeFilter, osionly, fsfOnly, propOnly, langFilter, tagFilter, sort, searchGroups]);

  const paged = filtered.slice(0, (page + 1) * PAGE_SIZE);
  const hasMore = paged.length < filtered.length;

  // Search result count
  const searchTotal = filteredGroups?.reduce((sum, g) => sum + g.results.length, 0) ?? 0;

  function resetPage() {
    setPage(0);
  }

  function handleQuery(v: string) {
    setQuery(v);
    resetPage();
  }

  function handleType(t: string) {
    setTypeFilter(typeFilter === t ? "" : t);
    resetPage();
  }

  function toggleProp() {
    const next = !propOnly;
    setPropOnly(next);
    if (next) { setOsiOnly(false); setFsfOnly(false); }
    resetPage();
  }

  function toggleOsi(v: boolean) {
    setOsiOnly(v);
    resetPage();
  }

  function toggleFsf(v: boolean) {
    setFsfOnly(v);
    resetPage();
  }

  function toggleTag(tag: string) {
    setTagFilter((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
    resetPage();
  }

  function clearTags() {
    setTagFilter(new Set());
    resetPage();
  }

  const handleSearchFocus = useCallback(() => {
    preloadIndex();
  }, []);

  const typeLabels: Record<string, string> = {
    software: t("type.software"),
    model: t("type.model"),
    data: t("type.data"),
    agent: t("type.agent"),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Compact Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
          <span className="text-[#7c3aed]">License</span>Atlas
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {t("home.subtitle", { total: String(stats.total) })}
          <Link href="/about" className="ml-2 text-[#7c3aed] hover:underline dark:text-[#a78bfa]">{t("home.aboutLink")}</Link>
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          onFocus={handleSearchFocus}
          className="w-full rounded-xl border border-zinc-200 bg-white/70 px-4 py-2 text-sm outline-none backdrop-blur-sm transition-colors focus:border-[#7c3aed] dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-100 sm:w-72"
        />

        {/* Type pills */}
        {["software", "model", "data", "agent"].map((tp) => (
          <button
            key={tp}
            onClick={() => handleType(tp)}
            className={`rounded-xl px-3 py-2 text-sm transition-all duration-200 active:scale-[0.97] ${
              typeFilter === tp
                ? "bg-[#7c3aed] text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >
            {typeLabels[tp]} ({stats.by_type[tp as keyof typeof stats.by_type] ?? 0})
          </button>
        ))}

        <span className="hidden h-5 w-px bg-zinc-200 sm:block dark:bg-zinc-700" />

        <label className={`flex cursor-pointer items-center gap-1.5 text-sm transition-opacity ${propOnly ? "pointer-events-none opacity-30" : "text-zinc-600 dark:text-zinc-400"}`}>
          <input type="checkbox" checked={osionly} disabled={propOnly} onChange={(e) => toggleOsi(e.target.checked)} className="accent-[#7c3aed]" />
          OSI
        </label>
        <label className={`flex cursor-pointer items-center gap-1.5 text-sm transition-opacity ${propOnly ? "pointer-events-none opacity-30" : "text-zinc-600 dark:text-zinc-400"}`}>
          <input type="checkbox" checked={fsfOnly} disabled={propOnly} onChange={(e) => toggleFsf(e.target.checked)} className="accent-[#7c3aed]" />
          FSF
        </label>
        <label className={`flex cursor-pointer items-center gap-1.5 text-sm ${propOnly ? "font-medium text-amber-700 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-400"}`}>
          <input type="checkbox" checked={propOnly} onChange={toggleProp} className="accent-amber-600" />
          {t("filter.proprietary")}
        </label>

        <span className="hidden h-5 w-px bg-zinc-200 sm:block dark:bg-zinc-700" />

        <div className="relative">
          <select
            value={langFilter}
            onChange={(e) => { setLangFilter(e.target.value); resetPage(); }}
            className={`appearance-none rounded-xl px-3 py-2 pr-7 text-sm outline-none transition-all duration-200 ${
              langFilter
                ? "border border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-600 dark:bg-teal-900/30 dark:text-teal-300"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
            }`}
          >
            <option value="">{t("home.allLanguages")}</option>
            <option value="zh">{t("lang.zh")}</option>
            <option value="ja">{t("lang.ja")}</option>
            <option value="ko">{t("lang.ko")}</option>
            <option value="ar">{t("lang.ar")}</option>
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        <button
          onClick={() => {
            setSort(sort === "newest" ? "" : "newest");
            resetPage();
          }}
          className={`rounded-xl px-3 py-2 text-sm transition-all duration-200 active:scale-[0.97] ${
            sort === "newest"
              ? "bg-[#7c3aed] text-white"
              : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
        >
          {t("home.latest")}
        </button>

      </div>

      {/* Tag Pills */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {allTags.map((tg) => {
          const tagKey = tg.toLowerCase().replace(/ /g, "-");
          const activeClass = themes[tagKey]?.badge || "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
          const isActive = tagFilter.has(tg);
          const isVerified = tagKey === "tl;drlegal-verified";
          return (
            <button
              key={tg}
              onClick={() => toggleTag(tg)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 active:scale-[0.97] ${
                isActive
                  ? activeClass
                  : "border border-zinc-200 bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {isVerified ? <span>{t(`tag.${tagKey}`) !== `tag.${tagKey}` ? t(`tag.${tagKey}`) : tg}</span> : (t(`tag.${tagKey}`) !== `tag.${tagKey}` ? t(`tag.${tagKey}`) : tg)} <span className="opacity-60">({(stats.by_tag as Record<string, number>)[tg] ?? 0})</span>
            </button>
          );
        })}
        <button
          onClick={clearTags}
          className={`rounded-full px-2.5 py-1 text-xs transition-opacity ${tagFilter.size > 0 ? "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" : "pointer-events-none opacity-0"}`}
        >
          {t("home.clear")}
        </button>
      </div>

      {/* Search Results (grouped) */}
      {searchLoading && (
        <p className="mb-4 text-xs text-zinc-400">{t("search.loading")}</p>
      )}

      {filteredGroups && !searchLoading && (
        <>
          <p className="mb-4 text-xs text-zinc-400">
            {t("home.showing", { shown: String(searchTotal), total: String(searchTotal) })}
          </p>
          {filteredGroups.map((group) => (
            <div key={group.key} className="mb-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t(`search.group.${group.key}`)} ({group.results.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.results.map((r) => {
                  const lic = allLicenses.find((l) => l.slug === r.slug);
                  if (!lic) return null;
                  return <LicenseCard key={r.slug} license={lic} />;
                })}
              </div>
            </div>
          ))}
          {searchTotal === 0 && !searchLoading && (
            <p className="py-20 text-center text-zinc-400">{t("home.noResults")}</p>
          )}
        </>
      )}

      {/* Normal Grid (non-search mode) */}
      {filteredGroups === null && !searchLoading && (
        <>
          <p className="mb-4 text-xs text-zinc-400">
            {t("home.showing", { shown: String(paged.length), total: String(filtered.length) })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((l) => (
              <LicenseCard key={l.slug} license={l} />
            ))}
          </div>
          {paged.length === 0 && (
            <p className="py-20 text-center text-zinc-400">{t("home.noResults")}</p>
          )}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 transition-all duration-300 hover:border-zinc-300 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {t("home.loadMore", { remaining: String(filtered.length - paged.length) })}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
