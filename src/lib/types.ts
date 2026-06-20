export interface License {
  slug: string;
  title: string;
  spdx_id: string;
  osi_approved: boolean;
  fsf_libre: boolean;
  fsf_tags: string[];
  deprecated: boolean;
  type: "software" | "model" | "data" | "agent" | "terms";
  proprietary: boolean;
  version: string;
  description: string;
  permissions: string[];
  conditions: string[];
  limitations: string[];
  tags: string[];
  family?: string;
  variant?: string;
  sources: { name: string; url: string; merged?: boolean }[];
  featured: boolean;
  body: string;
  bodies?: { lang: string; body: string }[];
  languages?: string[];
  created_at?: string;
  terms?: { name: string; url: string; slug?: string }[];
  popularity?: number;
  github_repos?: number;
  kaggle_datasets?: number;
  trend?: number[];
  blueoak_tier?: string;
}

export interface Stats {
  total: number;
  osi_approved: number;
  fsf_libre: number;
  proprietary: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  by_tag: Record<string, number>;
  updated: string;
}

// ── OSI License Review Tracker types (from KB v2.json) ──
export type TrackerStatus =
  | "approved" | "rejected" | "pending"
  | "withdrawn" | "superseded" | "legacy";

export type TrackerTimelineEventType =
  | "submission" | "revision" | "withdrawal"
  | "board_decision" | "feedback";

export type TrackerSentiment =
  | "positive" | "negative" | "neutral" | "question"
  | "mixed" | "support" | "oppose" | "critical";

export interface TrackerTimelineEvent {
  date: string;
  type: TrackerTimelineEventType;
  subject?: string;
  url?: string;
  sender: string;
  snippet: string;
  point?: string | null;
  point_zh?: string | null;
  sentiment: TrackerSentiment;
  source: "license-review" | "license-discuss" | "osi_api";
  position?: string;
  relevance?: "high" | "medium" | "low";
  text_ids?: string[];
}

export interface TrackerParticipant {
  name: string;
  role: "submitter" | "board_member" | "reviewer" | "participant";
  message_count: number;
  affiliation?: string;
}

export interface TrackerBoardVote {
  date: string;
  motion_by: string;
  motion_text: string;
  second_by: string;
  discussion: string;
  vote: { yes: number; no: number; abstain: number; unanimous?: boolean } | null;
  outcome: "approved" | "rejected" | null;
  source: "minutes" | "timeline" | "osi_api";
  minutes_file: string;
  minutes_url: string;
  source_note?: string;
}

export interface TrackerLicenseText {
  id?: string;
  filename: string;
  title?: string;
  version: string;
  version_label?: string;
  revision_label?: string;
  series?: string;
  date?: string;
  source_url?: string;
  message_url?: string;
  message_subject?: string;
  type?: string;
  downloaded_at?: string;
  sha256?: string;
  duplicate_of?: string;
  extraction_confidence?: "high" | "medium" | "low" | "none";
  text?: string;
  display_text?: string;
  normalized_text?: string;
  content_preview: string;
  size: number;
  match_score?: number;
  event_index?: number;
  event_type?: TrackerTimelineEventType;
}

export interface TrackerSubmission {
  id: string;
  name: string;
  aliases: string[];
  spdx_id: string;
  status: TrackerStatus;
  submitter: { name: string; org?: string; role?: string };
  participants: TrackerParticipant[];
  license_texts: TrackerLicenseText[];
  timeline: TrackerTimelineEvent[];
  board_vote: TrackerBoardVote | null;
  rejection_reason: string;
  osi_api_data: object | null;
  stats: {
    total_messages: number;
    date_range: string[];
    duration_days: number;
    unique_participants: string[];
  };
}

export interface TrackerData {
  meta: {
    generated_at: string;
    total_submissions: number;
    by_status: Record<string, number>;
    enriched_at?: string;
  };
  submissions: TrackerSubmission[];
}

// Lightweight index (tracker-index.json) entry
export interface TrackerIndexEntry {
  id: string;
  name: string;
  spdx_id: string;
  status: TrackerStatus;
  submitter: string;
  stats: { total_messages: number; duration_days: number; date_range: string[] };
  has_vote: boolean;
  has_timeline: boolean;
  review_dates?: {
    first_submitted?: string;
    decision?: string;
    decision_status?: "approved" | "rejected" | "";
  };
  text_meta?: {
    count: number;
    linked_count: number;
    duplicate_count: number;
    series: string[];
    latest_text_date: string;
  };
  timeline_meta: { count: number; first: string | null; last: string | null };
}

export interface TrackerIndexMeta {
  source_hash: string;
  generated_at: string;
  total_submissions: number;
  by_status: Record<string, number>;
}

export interface TrackerIndex {
  _meta: TrackerIndexMeta;
  [spdxOrId: string]: TrackerIndexEntry | TrackerIndexMeta;
}
