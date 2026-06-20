"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/badge";
import type { TrackerSubmission } from "@/lib/types";
import { TimelineStrip } from "./timeline-strip";
import { ReviewDetailTabs } from "./review-detail-tabs";

// Translate a TrackerStatus into the current language's label (falls back to capitalized status).
export function statusLabel(t: (k: string) => string, status: string): string {
  const key = `tracker.status-${status}`;
  const translated = t(key);
  return translated !== key ? translated : status.charAt(0).toUpperCase() + status.slice(1);
}

export function TrackerCard({
  s, expanded, onToggleExpand,
}: {
  s: TrackerSubmission;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const { t } = useLang();
  const submitter = s.submitter?.name || "Unknown";
  const msgs = s.stats?.total_messages || 0;
  const days = s.stats?.duration_days || 0;
  const timeline = s.timeline || [];

  // Lifted tab + focus + source-filter state so strip-node clicks can drive the detail panel.
  const [tab, setTab] = useState<"timeline" | "participants" | "texts" | "vote">("timeline");
  const [src, setSrc] = useState<"review" | "discuss" | "all">(() => {
    const reviewCount = timeline.filter((e) => e.source !== "license-discuss").length;
    return reviewCount === 0 ? "discuss" : "review";
  });
  const [focusEventIdx, setFocusEventIdx] = useState<number | null>(null);

  // Clicking a strip node: force-open this card, switch to timeline tab, ensure the event's
  // source is visible, and flash the event row.
  function handleNodeClick(targetTab: string, idx: number) {
    if (!expanded) onToggleExpand(s.id);
    setTab("timeline");
    setFocusEventIdx(idx);
    // Ensure the clicked event's source is visible: if current src filters it out, widen to "all".
    const ev = timeline[idx];
    if (ev && src !== "all") {
      const isDiscuss = ev.source === "license-discuss";
      if (src === "review" && isDiscuss) setSrc("all");
      if (src === "discuss" && !isDiscuss) setSrc("all");
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(`ev-${s.id}-${idx}`);
      flash(el);
    });
  }

  function focusTimelineEvent(idx: number) {
    setTab("timeline");
    setFocusEventIdx(idx);
    const ev = timeline[idx];
    if (ev && src !== "all") {
      const isDiscuss = ev.source === "license-discuss";
      if (src === "review" && isDiscuss) setSrc("all");
      if (src === "discuss" && !isDiscuss) setSrc("all");
    }
    requestAnimationFrame(() => {
      const el = document.getElementById(`ev-${s.id}-${idx}`);
      flash(el);
    });
  }

  function flash(el: HTMLElement | null) {
    if (!el) return;
    el.scrollIntoView({ behavior: "auto", block: "center" });
    el.classList.remove("tracker-flash");
    void el.offsetWidth;
    el.classList.add("tracker-flash");
    setTimeout(() => el.classList.remove("tracker-flash"), 1700);
  }

  // Clicking the vote node → expand + vote tab.
  function handleVoteClick() {
    if (!expanded) onToggleExpand(s.id);
    setTab("vote");
    setFocusEventIdx(null);
  }

  return (
    <div
      id={`card-${s.id}`}
      className={`mb-3 rounded-2xl border border-zinc-200/60 bg-white/60 p-5 backdrop-blur-xl transition hover:shadow-lg dark:border-zinc-800/60 dark:bg-zinc-900/40 ${expanded ? "" : "cursor-pointer hover:-translate-y-px"}`}
    >
      <div className="flex items-start justify-between gap-3" onClick={() => !expanded && onToggleExpand(s.id)}>
        <div>
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {s.name} <span className="text-xs font-normal text-zinc-400">{s.spdx_id ? `(${s.spdx_id})` : ""}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <span>👤 {submitter}</span>
            {days > 0 && <span>📅 {days} {t("tracker.days")}</span>}
            {msgs > 0 && <span>💬 {msgs} {t("tracker.messages")}</span>}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(s.id); setTab("participants"); }}
              className="cursor-pointer hover:text-[#7c3aed] dark:hover:text-[#a78bfa]"
            >
              👥 {s.participants.length} {t("tracker.participants")}
            </button>
          </div>
        </div>
        <Badge variant="tag" themeKey={`review-${s.status}`}>{statusLabel(t, s.status)}</Badge>
      </div>

      {timeline.length > 0 && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <TimelineStrip timeline={timeline} submitter={submitter} vote={s.board_vote} onNodeClick={handleNodeClick} onVoteClick={handleVoteClick} />
        </div>
      )}

      <button
        className="mt-3 border-none bg-none p-0 text-sm font-medium text-[#7c3aed] hover:underline dark:text-[#a78bfa]"
        onClick={() => onToggleExpand(s.id)}
      >
        {expanded ? t("tracker.collapse") : t("tracker.expand")}
      </button>

      {expanded && (
        <ReviewDetailTabs
          s={s}
          tab={tab}
          setTab={setTab}
          src={src}
          setSrc={setSrc}
          focusEventIdx={focusEventIdx}
          focusTimelineEvent={focusTimelineEvent}
          clearFocus={() => setFocusEventIdx(null)}
        />
      )}
    </div>
  );
}
