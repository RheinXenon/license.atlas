// Resolve a license-atlas license → OSI tracker index entry.
// Multi-level matching because many tracker submissions have no SPDX id
// (still under OSI review). KB is the source of truth and cannot be edited,
// so the bridging happens here.

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
  latest_event?: {
    date?: string;
    type?: string;
    source?: string;
    sender?: string;
    subject?: string;
    sentiment?: string;
    point?: string;
    point_zh?: string;
  } | null;
};

type TrackerIndex = { _meta?: Record<string, unknown> } & Record<string, TrackerEntry>;

const INDEX = trackerIndex as unknown as TrackerIndex;
const norm = (s: string) => (s || "").trim().toLowerCase();

// family → tracker index key (normalized id). Built once.
// Covers cases where one OSI submission reviews a whole family of licenses
// (e.g. all ModelGo variants are reviewed together under one thread).
const FAMILY_MAP: Record<string, string> = {
  modelgo: "modelgo-attribution-v2",
};

// name → index key. Last-resort fallback for licenses whose family is generic
// (e.g. CC "by"). Only add explicit, verified mappings here.
const NAME_MAP: Record<string, string> = {};

/**
 * Find the tracker entry for a license. Returns null when the license was
 * not reviewed by OSI (no entry / legacy entry with no content to show).
 */
export function resolveTrackerEntry(license: {
  spdx_id?: string;
  slug?: string;
  family?: string;
  title?: string;
}): TrackerEntry | null {
  // 1. SPDX id (the common path).
  if (license.spdx_id) {
    const hit = INDEX[norm(license.spdx_id)];
    if (hit) return hit;
  }
  // 2. Family mapping (e.g. ModelGo).
  if (license.family) {
    const key = FAMILY_MAP[norm(license.family)];
    if (key && INDEX[key]) return INDEX[key];
  }
  // 3. Explicit name mapping.
  if (license.title) {
    const key = NAME_MAP[norm(license.title)];
    if (key && INDEX[key]) return INDEX[key];
  }
  return null;
}

/** Whether a tracker entry has any review content worth linking to. */
export function hasReviewContent(e: TrackerEntry): boolean {
  if (!e) return false;
  if (e.has_timeline && (e.timeline_meta?.count || 0) > 0) return true;
  if (e.has_vote) return true;
  return false;
}
