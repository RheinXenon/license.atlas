"use client";

import type { TrackerParticipant } from "@/lib/types";

const ROLE_CLASS: Record<string, string> = {
  submitter: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  board_member: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  reviewer: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  participant: "bg-zinc-50 text-zinc-400 dark:bg-zinc-800/60",
};

function roleKey(role?: string) {
  return (role || "participant").replace(/[-\s]+/g, "_").toLowerCase();
}

function roleLabel(role?: string) {
  return roleKey(role)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ParticipantsList({ participants }: { participants: TrackerParticipant[] }) {
  if (!participants.length) return <div className="text-sm text-zinc-400">No participants identified.</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {participants.map((p, i) => {
        const key = roleKey(p.role);
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/60 bg-white/60 px-2.5 py-1 text-xs dark:border-zinc-700/60 dark:bg-zinc-900/40"
          >
            <span className="font-medium text-zinc-700 dark:text-zinc-200">{p.name}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_CLASS[key] || ROLE_CLASS.participant}`}>
              {roleLabel(p.role)}
            </span>
            <span className="font-mono text-zinc-400">{p.message_count}</span>
          </span>
        );
      })}
    </div>
  );
}
