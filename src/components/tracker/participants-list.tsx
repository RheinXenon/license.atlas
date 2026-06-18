"use client";

import type { TrackerParticipant } from "@/lib/types";

const ROLE_CLASS: Record<string, string> = {
  submitter: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "board-member": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  reviewer: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  participant: "bg-zinc-50 text-zinc-400 dark:bg-zinc-800/60",
};

export function ParticipantsList({ participants }: { participants: TrackerParticipant[] }) {
  if (!participants.length) return <div className="text-sm text-zinc-400">No participants identified.</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {participants.map((p, i) => {
        const roleKey = (p.role || "participant").replace(/[_\s]+/g, "-").toLowerCase();
        return (
          <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-white/60 px-2.5 py-1 text-xs dark:border-zinc-700/60 dark:bg-zinc-900/40">
            {p.name}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_CLASS[roleKey] || ROLE_CLASS.participant}`}>{p.role}</span>
            <span className="text-zinc-400">{p.message_count}</span>
          </span>
        );
      })}
    </div>
  );
}
