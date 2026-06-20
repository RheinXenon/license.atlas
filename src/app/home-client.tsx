"use client";

import { Suspense, useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LicenseCard } from "@/components/license-card";
import { themes } from "@/components/badge";
import { useLang } from "@/lib/i18n";
import { searchLicenses, preloadIndex } from "@/lib/search";
import type { SearchGroup, SearchResult } from "@/lib/search";
import licenses from "@/data/licenses-index.json";
import stats from "@/data/stats.json";
import type { License } from "@/lib/types";

const PAGE_SIZE = 30;
const REVIEW_TRACKED_TAG = "Review Tracked";
const allLicenses = licenses as License[];
const allTags = Array.from(
  new Set([...allLicenses.flatMap((l) => l.tags), REVIEW_TRACKED_TAG])
).filter((t) => !["MCP Server", "Agent Framework", "Agent Skill", "LLM Tool", "Proprietary"].includes(t));

const tagOrder = ["Public Domain", "Permissive", "Weak Copyleft", "Copyleft", "Creative Commons", "GNU", "ModelGo", "GNU Nonfree", "Hardware", "Custom", "HuggingFace", "MCP Server", "Agent Framework", "Agent Skill", "LLM Tool", "tl;drLegal Verified", "Review Tracked"];
allTags.sort((a, b) => {
  const ai = tagOrder.indexOf(a), bi = tagOrder.indexOf(b);
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  return a.localeCompare(b);
});

const groupTitleKey: Record<string, string> = {
  name: "search.group.name",
  source: "search.group.source",
  fulltext: "search.group.fulltext",
  fuzzy: "search.group.fuzzy",
  tracker: "search.group.tracker",
};

function TrackerSearchCard({ result }: { result: SearchResult }) {
  const { t } = useLang();
  const status = result.status || "pending";
  const statusKey = `tracker.status-${status}`;
  const label = t(statusKey);
  return (
    <Link
      href={`/tracker?focus=${encodeURIComponent(result.slug)}`}
      prefetch={false}
      className="group relative flex flex-col gap-3 overflow-visible rounded-2xl border border-zinc-200/70 bg-white/70 p-5 transition hover:-translate-y-px hover:border-[#7c3aed]/40 hover:shadow-lg dark:border-zinc-800/70 dark:bg-zinc-900/50"
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-zinc-950 group-hover:text-[#7c3aed] dark:text-zinc-50 dark:group-hover:text-[#a78bfa]">
            {result.title}
          </h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            status === "approved" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300"
            : status === "rejected" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-300"
            : status === "pending" ? "bg-sky-100 text-sky-700 dark:bg-sky-900/35 dark:text-sky-300"
            : status === "withdrawn" ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-300"
          }`}>
            {label !== statusKey ? label : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {result.spdx_id && (
            <code className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {result.spdx_id}
            </code>
          )}
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            {t("search.trackerBadge")}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {result.submitter && <span>{t("search.trackerSubmitter")}: {result.submitter}</span>}
        {result.firstSubmitted && <span>{t("search.trackerFirstSubmitted")}: {result.firstSubmitted}</span>}
        {result.decisionDate && <span>{t("search.trackerDecision")}: {result.decisionDate}</span>}
        {typeof result.messages === "number" && <span>{result.messages} {t("search.trackerMessages")}</span>}
      </div>
    </Link>
  );
}

export default function HomePageClient() {
  return <Suspense><HomeContent /></Suspense>;
}

function HomeContent() {
  const sp = useSearchParams();
  const { t, lang } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [query, setQuery] = useState(sp.get("q") ?? "");
  const [typeFilter, setTypeFilter] = useState(sp.get("type") ?? "");
  const [osionly, setOsiOnly] = useState(sp.get("osi") === "1");
  const [fsfOnly, setFsfOnly] = useState(sp.get("fsf") === "1");
  const [propOnly, setPropOnly] = useState(sp.get("prop") === "1");
  const [langFilter, setLangFilter] = useState(sp.get("lang") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "");
  const [reviewTrackedSlugs, setReviewTrackedSlugs] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<Set<string>>(() => {
    const t = sp.get("tags");
    return t ? new Set(t.split(",")) : new Set();
  });
  const [page, setPage] = useState(0);
  const searchParamString = sp.toString();

  const [searchGroups, setSearchGroups] = useState<SearchGroup[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/tracker-match").then(({ hasReviewContent, resolveTrackerEntry }) => {
      if (cancelled) return;
      setReviewTrackedSlugs(new Set(
        allLicenses
          .filter((l) => {
            const entry = resolveTrackerEntry(l);
            return entry && hasReviewContent(entry);
          })
          .map((l) => l.slug)
      ));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchParamString);
    const nextQuery = params.get("q") ?? "";
    const nextType = params.get("type") ?? "";
    const nextOsi = params.get("osi") === "1";
    const nextFsf = params.get("fsf") === "1";
    const nextProp = params.get("prop") === "1";
    const nextLang = params.get("lang") ?? "";
    const nextSort = params.get("sort") ?? "";
    const nextTags = params.get("tags");

    setQuery(nextQuery);
    setTypeFilter(nextType);
    setOsiOnly(nextOsi);
    setFsfOnly(nextFsf);
    setPropOnly(nextProp);
    setLangFilter(nextLang);
    setSort(nextSort);
    setTagFilter(nextTags ? new Set(nextTags.split(",")) : new Set());
    setPage(0);
  }, [searchParamString]);

  useEffect(() => {
    const reset = () => {
      setQuery("");
      setTypeFilter("");
      setOsiOnly(false);
      setFsfOnly(false);
      setPropOnly(false);
      setLangFilter("");
      setSort("");
      setTagFilter(new Set());
      setPage(0);
      setSearchGroups(null);
      setSearchLoading(false);
      const homePath = window.location.pathname.startsWith("/license.atlas") ? "/license.atlas" : "/";
      window.history.replaceState(null, "", homePath);
    };
    window.addEventListener("license-atlas:reset-home", reset);
    return () => window.removeEventListener("license-atlas:reset-home", reset);
  }, []);

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

  const popularityMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of allLicenses) {
      if (l.popularity != null) m.set(l.slug, l.popularity);
    }
    return m;
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchGroups) return null;
    return searchGroups.map((g) => {
      let results = g.results;
      if (g.key === "tracker") return { ...g, results };
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
      if (langFilter) {
        results = results.filter((r) => {
          const l = allLicenses.find((lic) => lic.slug === r.slug);
          return l?.languages?.includes(langFilter);
        });
      }
      if (tagFilter.size > 0) {
        results = results.filter((r) => {
          const l = allLicenses.find((lic) => lic.slug === r.slug);
          const tags = new Set([...(l?.tags || []), reviewTrackedSlugs.has(r.slug) ? REVIEW_TRACKED_TAG : ""]);
          return [...tagFilter].every((tag) => tags.has(tag));
        });
      }
      if (sort === "popular") {
        results = [...results].sort((a, b) => (popularityMap.get(b.slug) || 0) - (popularityMap.get(a.slug) || 0));
      }
      return { ...g, results };
    }).filter((g) => g.results.length > 0);
  }, [searchGroups, typeFilter, propOnly, osionly, fsfOnly, langFilter, tagFilter, reviewTrackedSlugs, sort, popularityMap]);

  useEffect(() => { preloadIndex(); }, []);

  const filtered = useMemo(() => {
    let arr = allLicenses.filter((l) => {
      if (typeFilter && l.type !== typeFilter) return false;
      if (propOnly) return l.proprietary;
      if (osionly && !l.osi_approved) return false;
      if (fsfOnly && !l.fsf_libre) return false;
      if (langFilter && !l.languages?.includes(langFilter)) return false;
      if (tagFilter.size > 0) {
        const tags = new Set([...l.tags, reviewTrackedSlugs.has(l.slug) ? REVIEW_TRACKED_TAG : ""]);
        if (![...tagFilter].every((tag) => tags.has(tag))) return false;
      }
      return true;
    });
    if (sort === "popular") arr = [...arr].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return arr;
  }, [typeFilter, osionly, fsfOnly, propOnly, langFilter, tagFilter, sort, reviewTrackedSlugs]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [typeFilter, osionly, fsfOnly, propOnly, langFilter, tagFilter, sort]);

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.08),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,1))] dark:bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.14),transparent_38%),linear-gradient(180deg,rgba(10,10,10,0.96),rgba(10,10,10,1))]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="mb-8">
          <h1 className="bg-gradient-to-r from-[#7c3aed] to-zinc-950 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:to-zinc-50 sm:text-5xl">
            {lang === "zh" ? "许可图鉴" : "LicenseAtlas"}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {lang === "zh"
              ? `收录 ${stats.total} 个软件、数据、AI 模型与 Agent 许可证，支持全文检索、标签筛选、许可文本对比与 OSI 审查追踪。`
              : `Browse ${stats.total} software, data, AI model, and agent licenses with full-text search, tag filtering, license text comparison, and OSI review tracking.`}
          </p>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search.placeholder")}
            className="min-w-[280px] flex-1 rounded-xl border border-zinc-200/70 bg-white/80 px-4 py-3 text-sm shadow-sm outline-none backdrop-blur focus:border-[#7c3aed] dark:border-zinc-800 dark:bg-zinc-900/70"
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/70">
            <option value="">{t("filter.allTypes")}</option>
            <option value="software">{t("filter.software")}</option>
            <option value="model">{t("filter.model")}</option>
            <option value="data">{t("filter.data")}</option>
            <option value="agent">{t("filter.agent")}</option>
            <option value="terms">{t("filter.terms")}</option>
          </select>
          <select value={langFilter} onChange={(e) => setLangFilter(e.target.value)} className="rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/70">
            <option value="">{t("filter.allLanguages")}</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-zinc-200/70 bg-white/80 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/70">
            <option value="">{t("filter.defaultSort")}</option>
            <option value="popular">{t("filter.popular")}</option>
          </select>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {allTags.map((tag) => {
            const active = tagFilter.has(tag);
            const theme = themes[tag] || themes.Custom;
            return (
              <button
                key={tag}
                onClick={() => setTagFilter((prev) => {
                  const next = new Set(prev);
                  if (next.has(tag)) next.delete(tag); else next.add(tag);
                  return next;
                })}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${active ? theme.badge : "border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"}`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={osionly} onChange={(e) => setOsiOnly(e.target.checked)} />
            <span>{t("filter.osiOnly")}</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={fsfOnly} onChange={(e) => setFsfOnly(e.target.checked)} />
            <span>{t("filter.fsfOnly")}</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={propOnly} onChange={(e) => setPropOnly(e.target.checked)} />
            <span>{t("filter.proprietaryOnly")}</span>
          </label>
        </div>

        {query.trim() ? (
          <section className="space-y-8">
            {searchLoading && <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("search.loading")}</p>}
            {!searchLoading && filteredGroups?.map((group) => (
              <div key={group.key}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{t(groupTitleKey[group.key] || "search.group.fulltext")}</h2>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{group.results.length}</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.key === "tracker"
                    ? group.results.map((r) => <TrackerSearchCard key={`${group.key}-${r.slug}`} result={r} />)
                    : group.results.map((r) => {
                      const license = allLicenses.find((l) => l.slug === r.slug);
                      return license ? <LicenseCard key={r.slug} license={license} /> : null;
                    })}
                </div>
              </div>
            ))}
            {!searchLoading && filteredGroups && filteredGroups.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("search.noResults")}</p>
            )}
          </section>
        ) : (
          <>
            <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              {mounted ? `${filtered.length} ${lang === "zh" ? "个结果" : "results"}` : ""}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pageItems.map((license) => (
                <LicenseCard key={license.slug} license={license} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-700">
                  {t("pager.prev")}
                </button>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm disabled:opacity-40 dark:border-zinc-700">
                  {t("pager.next")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
