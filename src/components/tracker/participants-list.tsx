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
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {participants.map((p, i) => {
        const key = roleKey(p.role);
        return (
          <div
            key={i}
            className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-zinc-200/60 bg-white/60 px-2.5 py-2 text-sm dark:border-zinc-700/60 dark:bg-zinc-900/40"
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-zinc-800 dark:text-zinc-100">{p.name}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_CLASS[key] || ROLE_CLASS.participant}`}>
                  {roleLabel(p.role)}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
              {p.message_count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
