"use client";

import { useLang } from "@/lib/i18n";
import type { TrackerBoardVote, TrackerStatus } from "@/lib/types";

export function BoardVoteCard({ v, status }: { v: TrackerBoardVote; status: TrackerStatus }) {
  const { t } = useLang();
  void status;
  const oc = v.outcome;
  const ocLabel = oc === "rejected" ? t("tracker.voteRejected") : oc === "approved" ? t("tracker.voteApproved") : "";
  const ocCls = oc === "rejected"
    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
    : oc === "approved"
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
    : "";
  const motionLc = (v.motion_text || "").toLowerCase();
  const withhold = /\b(withholds?\s+(?:its\s+)?approval|did\s+not\s+approve|do\s+not\s+approve|decline|reject)\b/.test(motionLc);
  const tallyNote = oc === "rejected" && withhold && v.vote && v.vote.yes > (v.vote.no || 0)
    ? <div className="my-2 rounded-lg border-l-[3px] border-red-500 bg-red-50 p-3 text-sm dark:bg-red-900/10">
        ⚠️ The {v.vote.yes}-{v.vote.no || 0} vote means the board AGREED to withhold approval — this is a <strong>rejection</strong>, not approval.
      </div>
    : null;

  return (
    <div className="mt-3 rounded-xl border border-violet-200/50 bg-gradient-to-br from-violet-50/40 to-cyan-50/40 p-4 dark:border-violet-800/40 dark:from-violet-900/10 dark:to-cyan-900/10">
      <div className="mb-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
        🗳️ {t("tracker.voteHeader")} — {v.date || "?"}
        {ocLabel && <span className={`ml-2 rounded px-2 py-0.5 text-xs font-bold ${ocCls}`}>{ocLabel}</span>}
      </div>
      <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-300">
        <strong>{t("tracker.motion")}:</strong> {v.motion_by || "—"}<br />
        <strong>{t("tracker.second")}:</strong> {v.second_by || "—"}
      </div>
      {v.motion_text && <div className="my-2 text-sm text-zinc-500 dark:text-zinc-400">{v.motion_text}</div>}
      {tallyNote}
      {v.vote && (
        <div className="flex gap-4 text-sm font-semibold">
          <span className="text-green-600 dark:text-green-400">✓ {v.vote.yes} Yes</span>
          <span className="text-red-600 dark:text-red-400">✗ {v.vote.no} No</span>
          <span className="text-zinc-400">○ {v.vote.abstain} Abstain</span>
        </div>
      )}
      {v.minutes_url && (
        <div className="mt-2 text-xs">
          <a href={v.minutes_url} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:underline dark:text-[#a78bfa]">
            {t("tracker.minutes")} ↗
          </a>
        </div>
      )}
    </div>
  );
}
