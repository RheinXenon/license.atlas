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

export interface ProjectShowcaseItem {
  name: string;
  url: string | null;
  icon_url: string | null;
  rank: number;
  rank_basis?: string | null;
  metric: {
    stars?: number;
    trendingScore?: number;
    downloads?: number;
    likes?: number;
    votes?: number;
    views?: number;
    kernels?: number;
  };
}

export interface ProjectShowcaseRecord {
  atlas_slug: string;
  title: string;
  spdx_id: string;
  type: License["type"];
  source_counts: Record<string, number>;
  sources: Record<string, ProjectShowcaseItem[]>;
}

export interface ProjectShowcaseIndex {
  _meta: {
    generated_at: string;
    source_hash: string;
    thresholds: Record<string, number>;
    record_count: number;
  };
  by_slug: Record<string, ProjectShowcaseRecord>;
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

export interface TrackerLicenseTextDiffLine {
  type: "context" | "add" | "remove";
  text: string;
}

export interface TrackerLicenseTextDiff {
  id: string;
  series: string;
  from_text_id: string;
  to_text_id: string;
  from_label: string;
  to_label: string;
  from_date: string;
  to_date: string;
  stats: { added: number; removed: number; unchanged: number };
  too_large?: boolean;
  truncated?: boolean;
  hunks: { old_start: number; new_start: number; lines: TrackerLicenseTextDiffLine[] }[];
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
  license_text_diffs?: TrackerLicenseTextDiff[];
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
  review_dates?: {
    first_submitted?: string;
    decision?: string;
    decision_status?: "approved" | "rejected" | "";
  };
  text_meta?: {
    count: number;
    linked_count: number;
    duplicate_count: number;
    diff_count: number;
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

// ── OSADL Open Source License Checklists types (tree structure) ──

// Action node: a single obligation or prohibition
export interface OsadlActionNode {
  text: string;
  type: 'must' | 'must-not';
  attributes?: string[];
}

// Either/Or group: choose one option from multiple branches
export interface OsadlEitherGroup {
  options: OsadlActionNode[][];  // Each option is a set of actions (AND)
  common?: OsadlActionNode[];    // Actions required regardless of choice
}

// Condition block: recursive structure for IF/EXCEPT IF nesting
export interface OsadlConditionBlock {
  condition: string;
  then?: OsadlActionNode[];              // Direct actions (AND)
  either?: OsadlEitherGroup[];          // Choice actions
  children?: OsadlConditionBlock[];     // Nested IF conditions
  except?: OsadlConditionBlock[];       // EXCEPT IF branches
}

// Use case tree: top-level structure for one use case
export interface OsadlUseCaseTree {
  use_case: string;
  root: OsadlConditionBlock;
}

// Flattened action for display (with path context)
export interface OsadlFlatAction {
  text: string;
  type: 'must' | 'must-not';
  attributes?: string[];
  condition_path: string[];  // e.g. ["Software modification", "Modified work Under Original license"]
  use_case: string;
  either_group?: number;     // Which either group this belongs to (for grouping)
  is_common?: boolean;       // Common action in either group
}

// Entry for a single license
export interface OsadlChecklistEntry {
  spdx_id: string;
  slug: string;
  source_urls: {
    json?: string;
    json_opt?: string;
    txt?: string;
    atlas_sources?: { name: string; url: string }[];
  };
  has_raw_txt: boolean;
  copyleft: string;
  source_disclosure: string;
  patent_hints: string | null;
  copyleft_clause: string | null;
  raw_hash: string;
  trees: OsadlUseCaseTree[];          // New: structured obligation trees
  compatibility_samples: {
    compatible: string[];
    incompatible: string[];
    check_dependency: string[];
  };
  counts: {
    use_cases: number;
    conditions: number;
    obligations: number;
    prohibitions: number;
  };
  compatibility_summary: {
    yes: number;
    no: number;
    same: number;
    unknown: number;
    check_dependency: number;
  };
  source_kind?: "official" | "generated";
  generation?: {
    valid?: boolean;
    model?: string;
    prompt_version?: string;
    revision_prompt_version?: string | null;
    created_at?: string;
    completed_at?: string;
    license_text_sha256?: string;
    validation?: unknown;
  };
}

export interface OsadlIndexMeta {
  source_hash: string;
  index_schema_version: number;
  generated_at: string;
  source: string;
  source_kind?: "official" | "generated";
  source_url: string;
  checklist_project_url: string;
  compatibility_notes_url: string;
  osloc2json_url: string;
  raw_data_license: string;
  attribution: string;
  copyright: string;
  disclaimer: string;
  draft_note: string;
  timestamp: string;
  matrix_timestamp: string;
  record_count: number;
  matrix_license_count: number;
  match_counts?: {
    osadl_records?: number;
    atlas_licenses?: number;
    matched?: number;
    osadl_unmatched?: number;
    osadl_unmatched_ids?: string[];
    atlas_unmatched?: number;
  };
}

export interface OsadlIndex {
  _meta: OsadlIndexMeta;
  by_spdx: Record<string, OsadlChecklistEntry>;
}

export interface GeneratedOsadlIndex {
  _meta: OsadlIndexMeta;
  by_spdx: Record<string, string>;
  by_slug: Record<string, OsadlChecklistEntry>;
}

// ── OSADL clause-linking types ───────────────────────────────────────────────

/** One clause span that a node_key maps to. */
export interface OsadlNodeLink {
  clauseId: string;
  startChar: number;
  endChar: number;
  /** direct = explicitly cited; context = surrounding paragraph; inferred = approximate */
  support: "direct" | "context" | "inferred";
}

/** All clause-link data for one license. */
export interface OsadlLinkFile {
  slug: string;
  source_kind: "generated" | "official";
  /** node_key → list of clause spans */
  node_links: Record<string, OsadlNodeLink[]>;
  /** All clause spans in order, used to build reverse index */
  clause_spans: { id: string; startChar: number; endChar: number }[];
}

/** Build-time index used to select one license's clause-link data by slug. */
export interface OsadlLinksIndex {
  _meta: {
    generated_at: string;
    record_count: number;
    generated_count: number;
    official_count: number;
  };
  by_slug: Record<string, OsadlLinkFile>;
}

/** A highlight region in the raw license text. */
export interface OsadlSourceHighlight {
  startChar: number;
  endChar: number;
  clauseId: string;
  /** Changes on every click so the same target can replay its locating flash. */
  activationId: number;
}
