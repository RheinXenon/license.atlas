"use client";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/badge";
import type { TrackerSubmission } from "@/lib/types";
import { TimelineStrip } from "./timeline-strip";
import { ReviewDetailTabs } from "./review-detail-tabs";

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
            <span>👥 {s.participants.length} {t("tracker.participants")}</span>
          </div>
        </div>
        <Badge variant="tag" themeKey={`review-${s.status}`}>{s.status}</Badge>
      </div>

      {timeline.length > 0 && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <TimelineStrip timeline={timeline} submitter={submitter} vote={s.board_vote} />
        </div>
      )}

      <button
        className="mt-3 border-none bg-none p-0 text-sm font-medium text-[#7c3aed] hover:underline dark:text-[#a78bfa]"
        onClick={() => onToggleExpand(s.id)}
      >
        {expanded ? t("tracker.collapse") : t("tracker.expand")}
      </button>

      {expanded && <ReviewDetailTabs s={s} />}
    </div>
  );
}
