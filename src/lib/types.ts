export interface License {
  slug: string;
  title: string;
  spdx_id: string;
  osi_approved: boolean;
  fsf_libre: boolean;
  deprecated: boolean;
  type: "software" | "model" | "data" | "agent";
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
  popularity?: number;
  github_repos?: number;
  kaggle_datasets?: number;
  trend?: number[];
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
