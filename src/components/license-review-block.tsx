"use client";

import { useLang } from "@/lib/i18n";
import { Badge } from "@/components/badge";
import { useRouter } from "next/navigation";
import trackerIndex from "@/data/tracker-index.json";

type TrackerEntry = {
  id: string;
  name?: string;
  spdx_id?: string;
  status: string;
  submitter?: string;
  stats?: { total_messages?: number; duration_days?: number; date_range?: string[] };
  has_vote?: boolean;
  has_timeline?: boolean;
  timeline_meta?: { count?: number; first?: string; last?: string };
};

type TrackerIndex = { _meta?: Record<string, unknown> } & Record<string, TrackerEntry>;

const normSpdx = (s: string) => (s || "").trim().toLowerCase();

export function LicenseReviewBlock({ spdxId }: { spdxId: string }) {
  const { t } = useLang();
  const router = useRouter();

  if (!spdxId) return null;
  const key = normSpdx(spdxId);
  const entry = (trackerIndex as unknown as TrackerIndex)[key];
  if (!entry) return null; // not reviewed by OSI

  const { status, submitter, stats, has_timeline, has_vote } = entry;
  const days = stats?.duration_days || 0;
  const msgs = stats?.total_messages || 0;

  // Compressed strip: a visual tease of the timeline shape.
  // Derive node count from timeline_meta.count (capped for layout).
  const tlMeta = entry.timeline_meta || {};
  const rawCount = tlMeta.count || 0;
  const nodeCount = Math.min(rawCount, 24);

  function viewFull() {
    router.push(`/tracker?focus=${encodeURIComponent(key)}`);
  }

  return (
    <section className="relative z-10 mt-6 rounded-2xl border border-zinc-200/60 bg-white/60 p-5 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/40">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t("review.title")}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("review.subtitle")}</p>
        </div>
        <Badge variant="tag" themeKey={`review-${status}`}>{status}</Badge>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
        <span>👤 {submitter}</span>
        {days > 0 && <span>📅 {days} {t("tracker.days")}</span>}
        {msgs > 0 && <span>💬 {msgs} {t("tracker.messages")}</span>}
        {has_vote && <span>🗳️ {t("tracker.tabVote")}</span>}
      </div>

      {has_timeline && nodeCount > 0 && (
        <button
          onClick={viewFull}
          className="group flex w-full flex-wrap items-center gap-1 rounded-lg bg-violet-50/50 p-2 dark:bg-violet-900/10"
          aria-label={t("tracker.viewFull")}
        >
          {Array.from({ length: nodeCount }).map((_, i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-sm bg-violet-300 transition-transform group-hover:scale-110 dark:bg-violet-400/60"
              style={{ opacity: 0.4 + 0.6 * (i / Math.max(1, nodeCount - 1)) }}
            />
          ))}
          {rawCount > 24 && (
            <span className="ml-1 text-xs text-zinc-400">+{rawCount - 24}</span>
          )}
        </button>
      )}

      <button
        onClick={viewFull}
        className="mt-3 text-sm font-medium text-[#7c3aed] transition-colors hover:text-[#6d28d9] dark:text-[#a78bfa]"
      >
        {t("tracker.viewFull")}
      </button>
    </section>
  );
}
