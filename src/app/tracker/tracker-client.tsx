"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import type { TrackerData } from "@/lib/types";
import { TrackerCard } from "@/components/tracker/tracker-card";

export function TrackerClient() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<TrackerData | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Lazy-load full tracker.json (3.25MB) on client.
  useEffect(() => {
    let cancelled = false;
    fetch(`${window.location.origin}/license.atlas/data/tracker.json`)
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

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [activeFilter, setActiveFilter] = useState("all");

  const STATUS_ORDER = ["all", "approved", "rejected", "pending", "withdrawn", "superseded", "legacy"];

  const visibleAll = useMemo(
    () => (data?.submissions || []).filter((s) => !(s.status === "legacy" && (!s.timeline || s.timeline.length === 0))),
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
}
