"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { TrackerSubmission } from "@/lib/types";
import { ParticipantsList } from "./participants-list";
import { BoardVoteCard } from "./board-vote-card";

export function ReviewDetailTabs({ s }: { s: TrackerSubmission }) {
  const { lang, t } = useLang();
  const timeline = s.timeline || [];
  const discussCount = timeline.filter((e) => e.source === "license-discuss").length;
  const reviewCount = timeline.length - discussCount;
  const defaultSrc = reviewCount === 0 ? "discuss" : "review";
  const [src, setSrc] = useState<"review" | "discuss" | "all">(defaultSrc);
  const [tab, setTab] = useState<"timeline" | "participants" | "texts" | "vote">("timeline");

  const hasVote = !!s.board_vote;
  const texts = s.license_texts || [];

  const filtered = timeline.filter((e) =>
    src === "all" ? true : src === "discuss" ? e.source === "license-discuss" : e.source !== "license-discuss"
  );

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
            onClick={() => setTab(k as typeof tab)}
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
            {filtered.map((ev, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr] gap-2 text-sm">
                <span className="text-xs text-zinc-400">{ev.date || "?"}</span>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {ev.type.replace(/_/g, " ")}
                    <span className="ml-1.5 rounded bg-violet-50 px-1 text-[9px] dark:bg-violet-900/20">{ev.source.includes("discuss") ? "discuss" : "review"}</span>
                  </div>
                  {ev.sender && ev.sender !== "Unknown" && <span className="font-medium">{ev.sender}: </span>}
                  <span className="text-zinc-600 dark:text-zinc-300">{(lang === "zh" ? ev.point_zh || ev.snippet : ev.snippet) || ev.subject?.slice(0, 100)}</span>
                  {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="ml-1 text-xs text-[#7c3aed] hover:underline dark:text-[#a78bfa]">[source ↗]</a>}
                </div>
              </div>
            ))}
            {!filtered.length && <div className="text-sm text-zinc-400">No events.</div>}
          </div>
        </div>
      )}

      {tab === "participants" && <ParticipantsList participants={s.participants} />}

      {tab === "texts" && (
        <div className="flex flex-col gap-1.5">
          {texts.map((tx, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-violet-50/40 px-3 py-2 text-sm dark:bg-violet-900/10">
              {tx.version && <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">v{tx.version}</span>}
              <span>{tx.filename}</span>
              <span className="text-xs text-zinc-400">{(tx.size / 1024).toFixed(1)}KB</span>
            </div>
          ))}
        </div>
      )}

      {tab === "vote" && hasVote && s.board_vote && <BoardVoteCard v={s.board_vote} status={s.status} />}
    </div>
  );
}
