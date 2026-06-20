"use client";

import { useLang } from "@/lib/i18n";
import type { OsadlChecklistAction, OsadlChecklistEntry, OsadlIndexMeta } from "@/lib/types";

function yesNoTone(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "yes") return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300";
  if (normalized === "no") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300";
}

function sourceDisclosureTone(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();
  if (normalized === "yes") return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300";
  if (normalized === "no") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300";
  return yesNoTone(value);
}

function formatTimestamp(value: string | undefined) {
  if (!value) return "";
  const isoish = value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(isoish);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function labelFor(lang: string, en: string, zh: string) {
  return lang === "zh" ? zh : en;
}

function MiniStat({ label, value, className }: {
  label: string;
  value: string | number | null | undefined;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${className || "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300"}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value || "Unknown"}</div>
    </div>
  );
}

function ChipList({ values }: { values: string[] }) {
  if (!values.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-300"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function ActionList({ actions, empty, tone }: {
  actions: OsadlChecklistAction[];
  empty: string;
  tone: "must" | "must-not";
}) {
  if (!actions.length) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">{empty}</p>;
  }
  const marker = tone === "must"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
    : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
  return (
    <ul className="space-y-2">
      {actions.map((action, idx) => (
        <li key={`${action.text}-${action.use_case}-${idx}`} className="flex gap-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${marker}`} />
          <span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{action.text}</span>
            {(action.use_case || action.condition) && (
              <span className="text-zinc-500 dark:text-zinc-400">
                {" "}
                ({[action.use_case, action.condition].filter(Boolean).join("; ")})
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ActionPreview({ actions, empty, tone, total, max, moreLabel }: {
  actions: OsadlChecklistAction[];
  empty: string;
  tone: "must" | "must-not";
  total: number;
  max: number;
  moreLabel: (remaining: number) => string;
}) {
  const visible = actions.slice(0, max);
  const remaining = Math.max(0, total - visible.length);
  return (
    <>
      <ActionList actions={visible} empty={empty} tone={tone} />
      {remaining > 0 && (
        <p className="mt-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {moreLabel(remaining)}
        </p>
      )}
    </>
  );
}

function CompatibilityBar({ entry, lang }: { entry: OsadlChecklistEntry; lang: string }) {
  const s = entry.compatibility_summary;
  const total = s.yes + s.no + s.same + s.unknown + s.check_dependency;
  if (!total) return null;
  const parts = [
    { key: "yes", value: s.yes, label: labelFor(lang, "Yes", "兼容"), className: "bg-emerald-500" },
    { key: "same", value: s.same, label: labelFor(lang, "Same", "相同"), className: "bg-sky-500" },
    { key: "check", value: s.check_dependency, label: labelFor(lang, "Check", "需检查"), className: "bg-amber-500" },
    { key: "no", value: s.no, label: labelFor(lang, "No", "不兼容"), className: "bg-rose-500" },
    { key: "unknown", value: s.unknown, label: labelFor(lang, "Unknown", "未知"), className: "bg-zinc-400" },
  ].filter((part) => part.value > 0);

  return (
    <div>
      <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        {parts.map((part) => (
          <span
            key={part.key}
            className={part.className}
            style={{ width: `${(part.value / total) * 100}%` }}
            title={`${part.label}: ${part.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        {parts.map((part) => (
          <span key={part.key}>{part.label}: {part.value}</span>
        ))}
      </div>
    </div>
  );
}

export function OsadlChecklistBlock({ entry, meta }: {
  entry: OsadlChecklistEntry | null;
  meta: OsadlIndexMeta;
}) {
  const { lang } = useLang();
  if (!entry) return null;

  const labels = {
    title: labelFor(lang, "OSADL Open Source License Checklist", "OSADL 开源许可证检查清单"),
    subtitle: labelFor(
      lang,
      "Checklist-derived obligations and compatibility signals from OSADL. Informational only, not legal advice.",
      "来自 OSADL 检查清单的义务与兼容性信号。仅供参考，不构成法律意见。",
    ),
    useCases: labelFor(lang, "Use Cases", "使用场景"),
    conditions: labelFor(lang, "Conditions", "条件"),
    must: labelFor(lang, "Must", "必须"),
    mustNot: labelFor(lang, "Must Not", "禁止"),
    compatibility: labelFor(lang, "Compatibility Summary", "兼容性摘要"),
    copyleft: labelFor(lang, "Copyleft", "Copyleft"),
    sourceDisclosure: labelFor(lang, "Source Disclosure", "源码披露"),
    patent: labelFor(lang, "Patent Hints", "专利提示"),
    raw: labelFor(lang, "Raw Checklist", "原始检查清单"),
    updated: labelFor(lang, "OSADL Data Timestamp", "OSADL 数据时间戳"),
    source: labelFor(lang, "Source", "来源"),
    noMustNot: labelFor(lang, "No explicit prohibition extracted in the normalized checklist summary.", "规范化摘要中未提取到明确禁止项。"),
    more: (count: number) => labelFor(lang, `+${count} more in the raw checklist.`, `原始检查清单中还有 ${count} 项。`),
  };

  return (
    <section className="fade-in-3 relative z-10 mb-8 rounded-2xl border border-cyan-200/70 bg-cyan-50/40 p-5 dark:border-cyan-900/40 dark:bg-cyan-950/10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {labels.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {labels.subtitle}
          </p>
        </div>
        <a
          href={entry.source_urls.txt || entry.source_urls.json || meta.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-sm font-medium text-cyan-700 transition-colors hover:border-cyan-300 hover:text-cyan-900 dark:border-cyan-800 dark:bg-zinc-950/40 dark:text-cyan-300 dark:hover:border-cyan-700"
        >
          {labels.raw} ↗
        </a>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label={labels.copyleft} value={entry.copyleft} className={yesNoTone(entry.copyleft)} />
        <MiniStat label={labels.sourceDisclosure} value={entry.source_disclosure} className={sourceDisclosureTone(entry.source_disclosure)} />
        <MiniStat label={labels.patent} value={entry.patent_hints || "Unknown"} className={entry.patent_hints === "Yes" ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300" : undefined} />
        <MiniStat label={labels.updated} value={formatTimestamp(meta.timestamp)} />
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {labels.useCases}
          </h3>
          <ChipList values={entry.use_cases} />
        </div>
        {entry.conditions.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {labels.conditions}
            </h3>
            <ChipList values={entry.conditions} />
          </div>
        )}
      </div>

      <div className="mb-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200/70 bg-white/70 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/30">
          <h3 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {labels.must} <span className="text-xs font-normal text-zinc-400">({entry.counts.obligations})</span>
          </h3>
          <ActionPreview actions={entry.obligations} empty="" tone="must" total={entry.counts.obligations} max={10} moreLabel={labels.more} />
        </div>
        <div className="rounded-xl border border-zinc-200/70 bg-white/70 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/30">
          <h3 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            {labels.mustNot} <span className="text-xs font-normal text-zinc-400">({entry.counts.prohibitions})</span>
          </h3>
          <ActionPreview actions={entry.prohibitions} empty={labels.noMustNot} tone="must-not" total={entry.counts.prohibitions} max={8} moreLabel={labels.more} />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-zinc-200/70 bg-white/70 p-4 dark:border-zinc-800/70 dark:bg-zinc-950/30">
        <h3 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          {labels.compatibility}
        </h3>
        <CompatibilityBar entry={entry} lang={lang} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
        <span>{labels.source}: {meta.source}</span>
        <a href={meta.source_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300">Raw data ↗</a>
        <a href={meta.checklist_project_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300">Project ↗</a>
        <a href={meta.compatibility_notes_url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-700 hover:text-cyan-900 dark:text-cyan-300">Compatibility ↗</a>
        <span>{meta.raw_data_license}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
        {meta.attribution} {meta.draft_note} {meta.disclaimer}
      </p>
    </section>
  );
}
