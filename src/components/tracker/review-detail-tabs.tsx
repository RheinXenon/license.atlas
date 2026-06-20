"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { formatTrackerDate } from "@/lib/tracker-date";
import type { TrackerSubmission } from "@/lib/types";
import { ParticipantsList } from "./participants-list";
import { BoardVoteCard } from "./board-vote-card";

type DetailTab = "timeline" | "participants" | "texts" | "vote";

// Sentiment → small colored pill, mirroring the timeline-strip sentiment tint.
// Only feedback events carry a meaningful sentiment; non-feedback or neutral → no pill.
const SENT_PILL: Record<string, string> = {
  positive: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  support: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  negative: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  oppose: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  question: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  mixed: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

function sentimentPill(type: string, sentiment?: string | null): string | null {
  if (!sentiment || type !== "feedback") return null;
  const s = sentiment.toLowerCase();
  return SENT_PILL[s] || null;
}

function sourceLabel(source: string): string {
  if (source === "license-discuss") return "discuss";
  if (source === "osi_api") return "api";
  return "review";
}

function confidenceClass(confidence?: string) {
  if (confidence === "high") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (confidence === "medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  if (confidence === "low") return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";
}

function diffLineClass(type: string) {
  if (type === "add") return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (type === "remove") return "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  return "text-zinc-600 dark:text-zinc-300";
}

function diffLinePrefix(type: string) {
  if (type === "add") return "+";
  if (type === "remove") return "-";
  return " ";
}

export function ReviewDetailTabs({
  s, tab, setTab, src, setSrc, focusEventIdx, focusTimelineEvent, clearFocus,
}: {
  s: TrackerSubmission;
  tab: DetailTab;
  setTab: (t: DetailTab) => void;
  src: "review" | "discuss" | "all";
  setSrc: (s: "review" | "discuss" | "all") => void;
  focusEventIdx: number | null;
  focusTimelineEvent: (idx: number) => void;
  clearFocus: () => void;
}) {
  const { lang, t } = useLang();
  const timeline = s.timeline || [];
  const discussCount = timeline.filter((e) => e.source === "license-discuss").length;
  const reviewCount = timeline.length - discussCount;

  const hasVote = !!s.board_vote;
  const texts = useMemo(() => s.license_texts || [], [s.license_texts]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textView, setTextView] = useState<"text" | "diff">("text");
  const selectedText = useMemo(
    () => texts.find((tx) => tx.id === selectedTextId) || texts.find((tx) => !tx.duplicate_of) || texts[0],
    [texts, selectedTextId],
  );
  const selectedDiff = useMemo(
    () => (s.license_text_diffs || []).find((d) => d.to_text_id === selectedText?.id) || null,
    [s.license_text_diffs, selectedText?.id],
  );

  const filtered = timeline.filter((e) =>
    src === "all" ? true : src === "discuss" ? e.source === "license-discuss" : e.source !== "license-discuss"
  );
  // Map filtered index → original timeline index so strip-node clicks (original idx) match rows.
  const filteredOrigIdx = timeline.map((_, i) => i).filter((i) => {
    const e = timeline[i];
    return src === "all" ? true : src === "discuss" ? e.source === "license-discuss" : e.source !== "license-discuss";
  });

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
            onClick={() => { setTab(k as DetailTab); if (k !== "timeline") clearFocus(); }}
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
            {filtered.map((ev, i) => {
              const origIdx = filteredOrigIdx[i];
              const focused = focusEventIdx === origIdx;
              const sentPill = sentimentPill(ev.type, ev.sentiment);
              return (
                <div
                  key={i}
                  id={`ev-${s.id}-${origIdx}`}
                  className={`grid grid-cols-[80px_1fr] gap-2 rounded-md px-1 py-0.5 text-sm ${focused ? "ring-2 ring-[#7c3aed]/40" : ""}`}
                >
                  <span className="text-xs text-zinc-400">{formatTrackerDate(ev.date)}</span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {ev.type.replace(/_/g, " ")}
                      <span className="ml-1.5 rounded bg-violet-50 px-1 text-[9px] dark:bg-violet-900/20">{sourceLabel(ev.source)}</span>
                      {sentPill && (
                        <span className={`ml-1.5 rounded px-1 text-[9px] ${sentPill}`}>{ev.sentiment}</span>
                      )}
                      {!!ev.text_ids?.length && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTextId(ev.text_ids?.[0] || null);
                            setTextView("text");
                            setTab("texts");
                            clearFocus();
                          }}
                          className="ml-1.5 rounded bg-cyan-50 px-1 text-[9px] text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-900/50"
                        >
                          text
                        </button>
                      )}
                    </div>
                    {ev.sender && ev.sender !== "Unknown" && <span className="font-medium">{ev.sender}: </span>}
                    <span className="text-zinc-600 dark:text-zinc-300">{(lang === "zh" ? ev.point_zh || ev.snippet : ev.snippet) || ev.subject?.slice(0, 100)}</span>
                    {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-1 inline-flex shrink-0 whitespace-nowrap text-xs text-[#7c3aed] hover:underline dark:text-[#a78bfa]">[source ↗]</a>}
                  </div>
                </div>
              );
            })}
            {!filtered.length && <div className="text-sm text-zinc-400">No events.</div>}
          </div>
        </div>
      )}

      {tab === "participants" && <ParticipantsList participants={s.participants} />}

      {tab === "texts" && (
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,0.85fr)_minmax(0,1.35fr)]">
          <div className="flex max-h-[560px] flex-col gap-1.5 overflow-auto pr-1">
            {texts.map((tx, i) => {
              const active = (selectedText?.id || texts[0]?.id) === tx.id;
              return (
                <button
                  key={tx.id || i}
                  type="button"
                  onClick={() => {
                    setSelectedTextId(tx.id || null);
                    setTextView("text");
                  }}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "border-[#7c3aed]/50 bg-violet-50 dark:border-[#a78bfa]/50 dark:bg-violet-950/30"
                      : "border-zinc-200/60 bg-white hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-zinc-950/30 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {tx.date && <span className="text-xs text-zinc-400">{formatTrackerDate(tx.date)}</span>}
                    {tx.series && <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">{tx.series}</span>}
                    {(tx.version_label || tx.version) && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">v{tx.version_label || tx.version}</span>}
                    {tx.revision_label && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{tx.revision_label}</span>}
                    {tx.duplicate_of && <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">duplicate</span>}
                  </div>
                  <div className="mt-1 line-clamp-2 font-medium text-zinc-800 dark:text-zinc-100">{tx.title || tx.filename}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>{(tx.size / 1024).toFixed(1)}KB</span>
                    {Number.isInteger(tx.event_index) && <span>timeline #{(tx.event_index || 0) + 1}</span>}
                    {tx.extraction_confidence && <span className={`rounded px-1.5 py-0.5 ${confidenceClass(tx.extraction_confidence)}`}>{tx.extraction_confidence}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="min-w-0 rounded-lg border border-zinc-200/60 bg-zinc-50/70 p-3 dark:border-zinc-800/60 dark:bg-zinc-950/40">
            {selectedText ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">{selectedText.title || selectedText.filename}</span>
                  {selectedText.sha256 && <span className="font-mono">{selectedText.sha256.slice(0, 12)}</span>}
                  {selectedText.message_url && (
                    <a href={selectedText.message_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex shrink-0 whitespace-nowrap text-[#7c3aed] hover:underline dark:text-[#a78bfa]">[source ↗]</a>
                  )}
                  {Number.isInteger(selectedText.event_index) && (
                    <button
                      type="button"
                      onClick={() => focusTimelineEvent(selectedText.event_index || 0)}
                      className="inline-flex shrink-0 whitespace-nowrap text-[#7c3aed] hover:underline dark:text-[#a78bfa]"
                    >
                      timeline #{(selectedText.event_index || 0) + 1}
                    </button>
                  )}
                </div>
                <div className="mb-2 flex gap-1.5">
                  <button type="button" onClick={() => setTextView("text")} className={`rounded-full px-2.5 py-1 text-xs ${textView === "text" ? "bg-[#7c3aed] text-white" : "border border-zinc-200/60 dark:border-zinc-700/60"}`}>Text</button>
                  <button type="button" onClick={() => setTextView("diff")} disabled={!selectedDiff} className={`rounded-full px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${textView === "diff" ? "bg-[#7c3aed] text-white" : "border border-zinc-200/60 dark:border-zinc-700/60"}`}>
                    Diff from previous{selectedDiff ? ` (+${selectedDiff.stats.added}/-${selectedDiff.stats.removed})` : ""}
                  </button>
                </div>
                {textView === "diff" && selectedDiff ? (
                  <div className="max-h-[560px] overflow-auto rounded-md bg-white p-3 font-mono text-xs leading-relaxed dark:bg-zinc-950">
                    <div className="mb-2 font-sans text-xs text-zinc-500">
                      {selectedDiff.from_label} → {selectedDiff.to_label}
                      {selectedDiff.truncated && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">truncated</span>}
                    </div>
                    {selectedDiff.too_large ? (
                      <div className="text-zinc-500">Diff is too large to render inline.</div>
                    ) : selectedDiff.hunks.length ? (
                      selectedDiff.hunks.map((hunk, hunkIdx) => (
                        <div key={hunkIdx} className="mb-3 overflow-hidden rounded border border-zinc-100 dark:border-zinc-800">
                          <div className="bg-zinc-100 px-2 py-1 text-[10px] text-zinc-500 dark:bg-zinc-900">@@ {hunk.old_start} / {hunk.new_start} @@</div>
                          {hunk.lines.map((line, lineIdx) => (
                            <div key={lineIdx} className={`grid grid-cols-[18px_1fr] gap-2 px-2 py-0.5 ${diffLineClass(line.type)}`}>
                              <span>{diffLinePrefix(line.type)}</span>
                              <span className="whitespace-pre-wrap break-words">{line.text || " "}</span>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="text-zinc-500">No textual changes from the previous version.</div>
                    )}
                  </div>
                ) : (
                  <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-white p-3 font-mono text-xs leading-relaxed text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                    {selectedText.display_text || selectedText.text || selectedText.content_preview || selectedText.filename}
                  </pre>
                )}
              </>
            ) : (
              <div className="text-sm text-zinc-400">No license text files found.</div>
            )}
          </div>
        </div>
      )}

      {tab === "vote" && hasVote && s.board_vote && <BoardVoteCard v={s.board_vote} status={s.status} />}
    </div>
  );
}
