"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import licenses from "@/data/licenses-index.json";
import { useLang } from "@/lib/i18n";
import type { License, OsadlChecklistAction, OsadlChecklistEntry, OsadlIndexMeta } from "@/lib/types";

type CompatibilityVerdict = "Yes" | "No" | "Same" | "Unknown" | "Check dependency";
type CompatibilityPosition = { x: number; y: number; listMaxHeight: number };

interface CompatibilityRow {
  target_spdx_id: string;
  verdict: CompatibilityVerdict;
  explanation: string;
}

interface CompatibilityRecord {
  spdx_id: string;
  compatibility?: CompatibilityRow[];
}

type ChecklistTone = "must" | "must-not";

interface ChecklistDisplayAction {
  text: string;
  tone: ChecklistTone;
  condition: string;
  useCases: string[];
}

const licenseBySpdx = new Map(
  (licenses as Pick<License, "spdx_id" | "slug" | "title" | "version">[])
    .filter((license) => license.spdx_id)
    .map((license) => [normSpdx(license.spdx_id), license]),
);

function normSpdx(value: string | undefined) {
  return (value || "").trim().toLowerCase();
}

function osadlDataUrl() {
  if (typeof window === "undefined") return "/data/osadl-checklists.json";
  const basePath = window.location.pathname.startsWith("/license.atlas") ? "/license.atlas" : "";
  return `${basePath}/data/osadl-checklists.json`;
}

function compactSearch(value: string | undefined) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function titleInitials(value: string | undefined) {
  return (value || "")
    .replace(/\([^)]*\)/g, " ")
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word && !/^(the|a|an|and|or|of|for|to|version|license)$/i.test(word))
    .map((word) => word[0])
    .join("")
    .toLowerCase();
}

function licenseMatchesQuery(row: CompatibilityRow, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const compact = compactSearch(q);
  const license = licenseBySpdx.get(normSpdx(row.target_spdx_id));
  const values = [
    row.target_spdx_id,
    license?.spdx_id,
    license?.slug,
    license?.title,
    license?.version,
    titleInitials(license?.title),
  ].filter(Boolean) as string[];
  return values.some((value) => {
    const raw = value.toLowerCase();
    return raw.includes(q) || compactSearch(raw).includes(compact);
  });
}

function yesNoTone(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized.startsWith("yes")) return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300";
  if (normalized.startsWith("no")) return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300";
}

function sourceDisclosureTone(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized.startsWith("yes")) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300";
  if (normalized.startsWith("no")) return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300";
  return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300";
}

function patentHintsTone(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized.startsWith("yes")) return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300";
  if (normalized.startsWith("no")) return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300";
  return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300";
}

function formatTimestamp(value: string | undefined) {
  if (!value) return "";
  const isoish = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(isoish);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function InlineStat({ label, value, className, tooltip }: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
  tooltip?: string;
}) {
  return (
    <span className="group/stat relative inline-flex" data-osadl-interactive="true">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${className || "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"}`}
        aria-label={tooltip ? `${label}: ${value || "Unknown"}. ${tooltip}` : undefined}
      >
        <span className="font-medium opacity-70">{label}</span>
        <span className="font-semibold">{value || "Unknown"}</span>
      </span>
      {tooltip && (
        <span className="pointer-events-none absolute left-1/2 top-full z-[120] mt-1.5 hidden w-64 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[11px] leading-snug text-zinc-700 shadow-lg group-hover/stat:block group-focus-within/stat:block dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          {tooltip}
        </span>
      )}
    </span>
  );
}

function mergeChecklistActions(
  obligations: OsadlChecklistAction[],
  prohibitions: OsadlChecklistAction[],
  defaultCondition: string,
) {
  const merged = new Map<string, ChecklistDisplayAction>();

  function add(action: OsadlChecklistAction, tone: ChecklistTone) {
    const condition = action.condition || defaultCondition;
    const key = `${tone}\u0000${condition}\u0000${action.text}`;
    const existing = merged.get(key);
    if (existing) {
      if (action.use_case && !existing.useCases.includes(action.use_case)) {
        existing.useCases.push(action.use_case);
      }
      return;
    }
    merged.set(key, {
      text: action.text,
      tone,
      condition,
      useCases: action.use_case ? [action.use_case] : [],
    });
  }

  obligations.forEach((action) => add(action, "must"));
  prohibitions.forEach((action) => add(action, "must-not"));
  return Array.from(merged.values());
}

function ChecklistActionTree({ entry, labels }: {
  entry: OsadlChecklistEntry;
  labels: {
    must: string;
    mustNot: string;
    required: string;
    prohibited: string;
    actionsTitle: string;
    defaultCondition: string;
    noActions: string;
    noProhibitionsCompact: string;
    more: (remaining: number) => string;
  };
}) {
  const actions = mergeChecklistActions(entry.obligations, entry.prohibitions, labels.defaultCondition);
  const groups = new Map<string, ChecklistDisplayAction[]>();
  actions.forEach((action) => {
    const list = groups.get(action.condition) || [];
    list.push(action);
    groups.set(action.condition, list);
  });
  const groupEntries = Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === labels.defaultCondition) return -1;
    if (b === labels.defaultCondition) return 1;
    return a.localeCompare(b);
  });
  const displayedMustCount = actions.filter((action) => action.tone === "must").length;
  const displayedMustNotCount = actions.length - displayedMustCount;

  if (!actions.length) {
    return (
      <div className="rounded-xl border border-zinc-200/70 bg-white/70 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/30">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{labels.actionsTitle}</h3>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">0</span>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{labels.noActions}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200/70 bg-white/70 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/30">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{labels.actionsTitle}</h3>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {labels.required}: {displayedMustCount}
          </span>
          {displayedMustNotCount > 0 ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              {labels.prohibited}: {displayedMustNotCount}
            </span>
          ) : (
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
              {labels.noProhibitionsCompact}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 font-mono text-[12px] leading-5 text-zinc-700 dark:text-zinc-300">
        {groupEntries.map(([condition, group]) => {
          const visible = group.slice(0, 8);
          const remaining = group.length - visible.length;
          const mustCount = group.filter((action) => action.tone === "must").length;
          const mustNotCount = group.length - mustCount;
          return (
            <div key={condition}>
              <div className="mb-1 grid grid-cols-[4ch_minmax(0,1fr)] text-zinc-900 dark:text-zinc-100">
                <span>+--</span>
                <span>
                  <span className="font-semibold">{condition}</span>
                <span className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400">
                  {" "}
                  ({[
                    mustCount > 0 ? `${labels.must}: ${mustCount}` : "",
                    mustNotCount > 0 ? `${labels.mustNot}: ${mustNotCount}` : "",
                  ].filter(Boolean).join(", ")})
                </span>
                </span>
              </div>
              <ul className="space-y-0.5">
                {visible.map((action, idx) => (
                  <li key={`${condition}-${action.tone}-${action.text}-${idx}`} className="grid grid-cols-[4ch_11ch_minmax(0,1fr)] gap-x-1">
                    <span className={action.tone === "must" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
                      | -
                    </span>
                    <span className={action.tone === "must" ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}>
                      [{action.tone === "must" ? labels.must : labels.mustNot}]
                    </span>{" "}
                    <span className="font-sans">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{action.text}</span>
                      {action.useCases.length > 0 && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {" "}
                          ({action.useCases.join(" / ")})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {remaining > 0 && (
                <p className="mt-1 grid grid-cols-[4ch_minmax(0,1fr)] text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span>|</span>
                  <span className="font-sans">{labels.more(remaining)}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompatibilityBar({ entry, onSelect, t }: {
  entry: OsadlChecklistEntry;
  t: (key: string, params?: Record<string, string | number>) => string;
  onSelect: (verdict: CompatibilityVerdict, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const s = entry.compatibility_summary;
  const total = s.yes + s.no + s.same + s.unknown + s.check_dependency;
  if (!total) return null;
  const parts = [
    { key: "yes", verdict: "Yes" as const, value: s.yes, label: t("osadl.verdict.yes"), barClass: "bg-emerald-500 hover:bg-emerald-600", swatchClass: "bg-emerald-500" },
    { key: "same", verdict: "Same" as const, value: s.same, label: t("osadl.verdict.same"), barClass: "bg-sky-500 hover:bg-sky-600", swatchClass: "bg-sky-500" },
    { key: "check", verdict: "Check dependency" as const, value: s.check_dependency, label: t("osadl.verdict.check"), barClass: "bg-amber-500 hover:bg-amber-600", swatchClass: "bg-amber-500" },
    { key: "no", verdict: "No" as const, value: s.no, label: t("osadl.verdict.no"), barClass: "bg-rose-500 hover:bg-rose-600", swatchClass: "bg-rose-500" },
    { key: "unknown", verdict: "Unknown" as const, value: s.unknown, label: t("osadl.verdict.unknown"), barClass: "bg-zinc-400 hover:bg-zinc-500", swatchClass: "bg-zinc-400" },
  ].filter((part) => part.value > 0);

  return (
    <div>
      <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {parts.map((part) => (
          <button
            key={part.key}
            type="button"
            className={`${part.barClass} transition-colors`}
            style={{ width: `${(part.value / total) * 100}%` }}
            onClick={(event) => onSelect(part.verdict, event)}
            title={`${part.label}: ${part.value}`}
            aria-label={`${part.label}: ${part.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {parts.map((part) => (
          <button
            key={part.key}
            type="button"
            onClick={(event) => onSelect(part.verdict, event)}
            className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <span className={`h-2 w-2 rounded-full ${part.swatchClass}`} aria-hidden="true" />
            {part.label}: {part.value}
          </button>
        ))}
      </div>
    </div>
  );
}

function verdictLabel(t: (key: string) => string, verdict: CompatibilityVerdict) {
  const labels: Record<CompatibilityVerdict, string> = {
    Yes: "osadl.verdict.yes",
    No: "osadl.verdict.no",
    Same: "osadl.verdict.same",
    Unknown: "osadl.verdict.unknown",
    "Check dependency": "osadl.verdict.checkDependency",
  };
  return t(labels[verdict]);
}

function CompatibilityPopover({
  rows,
  verdict,
  position,
  query,
  loading,
  error,
  t,
  onQuery,
}: {
  rows: CompatibilityRow[];
  verdict: CompatibilityVerdict;
  position: CompatibilityPosition;
  query: string;
  loading: boolean;
  error: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  onQuery: (value: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const filtered = rows
    .filter((row) => row.verdict === verdict)
    .filter((row) => licenseMatchesQuery(row, q));
  const labels = {
    search: t("osadl.search"),
    loading: t("osadl.loading"),
    error: t("osadl.loadError"),
    empty: t("osadl.noLicenses"),
  };

  return (
    <div
      className="absolute z-50 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
      style={{ left: position.x, top: position.y }}
      role="dialog"
      aria-label={verdictLabel(t, verdict)}
    >
      <div className="border-b border-zinc-100 px-2 py-1.5 dark:border-zinc-800">
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={labels.search}
          className="h-7 w-full rounded border border-zinc-200 bg-white px-2 text-[11px] outline-none transition-colors placeholder:text-zinc-400 focus:border-cyan-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>
      <div className="overflow-y-auto py-1.5 pr-5" style={{ maxHeight: position.listMaxHeight }}>
        {loading ? (
          <p className="px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400">{labels.loading}</p>
        ) : error ? (
          <p className="px-2 py-1 text-[11px] text-rose-600 dark:text-rose-300">{labels.error}</p>
        ) : filtered.length ? (
          filtered.map((row) => {
            const license = licenseBySpdx.get(normSpdx(row.target_spdx_id));
            const name = license?.title || row.target_spdx_id;
            return license ? (
              <Link
                key={row.target_spdx_id}
                href={`/licenses/${license.slug}`}
                className="block truncate border-b border-zinc-100 px-2 py-1 text-[11px] leading-5 text-zinc-700 transition-colors last:border-b-0 hover:bg-cyan-50 hover:text-cyan-800 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-cyan-950/30 dark:hover:text-cyan-200"
              >
                {name} ↗
              </Link>
            ) : (
              <div key={row.target_spdx_id} className="truncate border-b border-zinc-100 px-2 py-1 text-[11px] leading-5 text-zinc-500 last:border-b-0 dark:border-zinc-800 dark:text-zinc-400">
                {name}
              </div>
            );
          })
        ) : (
          <p className="px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400">{labels.empty}</p>
        )}
      </div>
    </div>
  );
}

export function OsadlChecklistBlock({ entry, meta }: {
  entry: OsadlChecklistEntry | null;
  meta: OsadlIndexMeta;
}) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [activeVerdict, setActiveVerdict] = useState<CompatibilityVerdict | null>(null);
  const [compatibilityRows, setCompatibilityRows] = useState<CompatibilityRow[]>([]);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const [compatibilityError, setCompatibilityError] = useState("");
  const [compatibilityQuery, setCompatibilityQuery] = useState("");
  const [compatibilityPosition, setCompatibilityPosition] = useState<CompatibilityPosition>({ x: 16, y: 16, listMaxHeight: 260 });
  const compatibilityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeVerdict) return;
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && compatibilityRef.current?.contains(target)) return;
      setActiveVerdict(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeVerdict]);

  if (!entry) return null;
  const currentEntry = entry;

  async function loadCompatibilityRows() {
    if (compatibilityRows.length || compatibilityLoading) return;
    setCompatibilityLoading(true);
    setCompatibilityError("");
    try {
      const response = await fetch(osadlDataUrl());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { records?: CompatibilityRecord[] };
      const record = (data.records || []).find((item) => normSpdx(item.spdx_id) === normSpdx(currentEntry.spdx_id));
      setCompatibilityRows(record?.compatibility || []);
    } catch (error) {
      setCompatibilityError(error instanceof Error ? error.message : "unknown error");
    } finally {
      setCompatibilityLoading(false);
    }
  }

  function openCompatibility(verdict: CompatibilityVerdict, event: MouseEvent<HTMLButtonElement>) {
    setCompatibilityQuery("");
    const width = 288;
    const margin = 8;
    const offset = 10;
    const rect = compatibilityRef.current?.getBoundingClientRect();
    const originLeft = rect?.left ?? 0;
    const originTop = rect?.top ?? 0;
    const maxLocalX = window.innerWidth - width - margin - originLeft;
    const x = Math.max(margin, Math.min(event.clientX - originLeft + offset, maxLocalX));
    const y = Math.max(margin, event.clientY - originTop + offset);
    const searchAndChromeHeight = 52;
    const availableListHeight = window.innerHeight - (event.clientY + offset) - margin - searchAndChromeHeight;
    setCompatibilityPosition({
      x,
      y,
      listMaxHeight: Math.max(72, Math.min(260, availableListHeight)),
    });
    setActiveVerdict((current) => current === verdict ? null : verdict);
    void loadCompatibilityRows();
  }

  const labels = {
    title: t("osadl.title"),
    must: t("osadl.must"),
    mustNot: t("osadl.mustNot"),
    required: t("osadl.required"),
    prohibited: t("osadl.prohibited"),
    actionsTitle: t("osadl.actionsTitle"),
    defaultCondition: t("osadl.defaultCondition"),
    compatibility: t("osadl.compatibility"),
    copyleft: t("osadl.copyleft"),
    sourceDisclosure: t("osadl.sourceDisclosure"),
    patent: t("osadl.patent"),
    raw: t("osadl.raw"),
    updated: t("osadl.updated"),
    source: t("osadl.source"),
    rawData: t("osadl.rawData"),
    project: t("osadl.project"),
    compatibilityLink: t("osadl.compatibilityLink"),
    copyleftHelp: t("osadl.copyleftHelp"),
    sourceDisclosureHelp: t("osadl.sourceDisclosureHelp"),
    patentHelp: t("osadl.patentHelp"),
    noActions: t("osadl.noActions"),
    noProhibitionsCompact: t("osadl.noProhibitionsCompact"),
    more: (count: number) => t("osadl.more", { count }),
  };
  function toggleExpanded() {
    setExpanded((current) => !current);
    setActiveVerdict(null);
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof Element && !!target.closest("a,button,input,textarea,select,[data-osadl-interactive='true']");
  }

  return (
    <section
      className="fade-in-3 relative z-10 mb-8 cursor-pointer rounded-2xl border border-cyan-200/70 bg-cyan-50/40 p-4 transition-colors hover:border-cyan-300/80 hover:bg-cyan-50/70 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 dark:border-cyan-900/40 dark:bg-cyan-950/10 dark:hover:border-cyan-800/70 dark:hover:bg-cyan-950/20 sm:p-5"
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) return;
        toggleExpanded();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (isInteractiveTarget(event.target)) return;
        event.preventDefault();
        toggleExpanded();
      }}
    >
      <div className={expanded ? "mb-4 flex flex-col gap-2" : "flex flex-col gap-2"}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {labels.title}
          </h2>
          <span className="font-mono text-xs text-cyan-700 dark:text-cyan-300" aria-hidden="true">
            {expanded ? "[-]" : "[+]"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <InlineStat label={labels.copyleft} value={entry.copyleft} className={yesNoTone(entry.copyleft)} tooltip={labels.copyleftHelp} />
          <InlineStat label={labels.sourceDisclosure} value={entry.source_disclosure} className={sourceDisclosureTone(entry.source_disclosure)} tooltip={labels.sourceDisclosureHelp} />
          <InlineStat label={labels.patent} value={entry.patent_hints || "Unknown"} className={patentHintsTone(entry.patent_hints)} tooltip={labels.patentHelp} />
          <InlineStat label={labels.updated} value={formatTimestamp(meta.timestamp)} />
        </div>
      </div>

      {expanded && (
        <div data-osadl-interactive="true">
          <div className="mb-5">
            <ChecklistActionTree entry={entry} labels={labels} />
          </div>

          <div className="mb-4 rounded-xl border border-zinc-200/70 bg-white/70 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/30">
            <h3 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              {labels.compatibility}
            </h3>
            <div
              ref={compatibilityRef}
              className="relative w-full"
            >
              <CompatibilityBar entry={entry} t={t} onSelect={openCompatibility} />
              {activeVerdict && (
                <CompatibilityPopover
                  rows={compatibilityRows}
                  verdict={activeVerdict}
                  position={compatibilityPosition}
                  query={compatibilityQuery}
                  loading={compatibilityLoading}
                  error={compatibilityError}
                  t={t}
                  onQuery={setCompatibilityQuery}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              {labels.source}: {meta.source}{" "}
              <a href={entry.source_urls.txt || entry.source_urls.json || meta.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300">
                {labels.raw} ↗
              </a>
            </span>
            <a href={meta.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300">{labels.rawData}</a>
            <a href={meta.checklist_project_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300">{labels.project}</a>
            <a href={meta.compatibility_notes_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300">{labels.compatibilityLink}</a>
          </div>
        </div>
      )}
    </section>
  );
}
