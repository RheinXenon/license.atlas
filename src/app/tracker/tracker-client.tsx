"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import type { TrackerData, TrackerSubmission } from "@/lib/types";

export function TrackerClient() {
  const { lang, t } = useLang();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<TrackerData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const focusRef = useRef<string | null>(null);

  // Lazy-load full tracker.json (3.25MB) on client.
  useEffect(() => {
    let cancelled = false;
    fetch(`${window.location.origin}/license.atlas/data/tracker.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: TrackerData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Focus handling: expand + scroll + flash when ?focus=<spdx|id> present.
  const focusKey = searchParams.get("focus");
  focusRef.current = focusKey;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data || !focusKey) return;
    const norm = (s: string) => s.trim().toLowerCase();
    const sub = data.submissions.find(
      (s) => norm(s.spdx_id) === norm(focusKey) || norm(s.id) === norm(focusKey)
    );
    if (!sub) return;
    setExpandedIds((prev) => new Set(prev).add(sub.id));
    // scroll + flash after render
    requestAnimationFrame(() => {
      const el = document.getElementById(`card-${sub.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("tracker-flash");
        void el.offsetWidth;
        el.classList.add("tracker-flash");
        setTimeout(() => el.classList.remove("tracker-flash"), 1700);
      }
    });
    // clear focus param to avoid re-scroll on refresh
    router.replace("/tracker");
  }, [data, focusKey, router]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">
        Failed to load tracker data.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">
        {t("tracker.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Task 8 fills in search/sort/filter + card list */}
      <p className="text-sm text-zinc-400">[tracker UI — filled in Task 8]</p>
      <pre className="mt-4 text-xs text-zinc-400">
        {`loaded ${data.submissions.length} submissions`}
      </pre>
    </div>
  );
}
