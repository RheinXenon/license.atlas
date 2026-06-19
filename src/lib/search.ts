import MiniSearch from "minisearch";

export type SearchGroup = {
  key: string;
  results: SearchResult[];
};

export type SearchResult = {
  slug: string;
  title: string;
  spdx_id: string;
  type: string;
  score: number;
};

type RawResult = { id: string; slug: string; title: string; spdx_id: string; type: string; score: number };

const INDEX_URL = "/license.atlas/search-index.json";

const indexOptions = {
  fields: ["title", "spdx_id", "sources", "description", "body"],
  storeFields: ["slug", "title", "spdx_id", "type"],
  idField: "slug",
};

let miniSearch: MiniSearch | null = null;
let loading: Promise<MiniSearch> | null = null;

function loadIndex(): Promise<MiniSearch> {
  if (miniSearch) return Promise.resolve(miniSearch);
  if (loading) return loading;

  loading = fetch(INDEX_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`Search index fetch failed: ${r.status}`);
      return r.text();
    })
    .then((json) => {
      miniSearch = MiniSearch.loadJSON(json, indexOptions);
      return miniSearch;
    });
  return loading;
}

export function preloadIndex() {
  loadIndex().catch(() => {});
}

function normalizeIdentifier(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function identifierBoost(query: string, result: RawResult) {
  const q = normalizeIdentifier(query);
  if (!q) return 0;

  const slug = normalizeIdentifier(result.slug || "");
  const spdx = normalizeIdentifier(result.spdx_id || "");
  const title = normalizeIdentifier(result.title || "");

  // SPDX ids and slugs are what users usually mean when typing identifiers
  // such as "CC-BY-SA". Prefer exact/prefix identifier matches over generic
  // token matches ("cc", "by", "sa") from title/body text.
  if (spdx === q || slug === q) return 10000;
  if (spdx.startsWith(q) || slug.startsWith(q)) return 7000;
  if (spdx.includes(q) || slug.includes(q)) return 4000;
  if (title.includes(q)) return 1000;
  return 0;
}

function rankResults(query: string, raw: RawResult[]) {
  return [...raw]
    .map((r) => ({ ...r, score: r.score + identifierBoost(query, r) }))
    .sort((a, b) => b.score - a.score);
}

export async function searchLicenses(
  query: string
): Promise<SearchGroup[]> {
  const ms = await loadIndex();
  const q = query.trim();
  if (!q) return [];

  const nameResults = ms.search(q, {
    fields: ["title", "spdx_id"],
    boost: { title: 10, spdx_id: 8 },
    prefix: true,
    combineWith: "OR",
  }) as unknown as RawResult[];

  const sourceResults = ms.search(q, {
    fields: ["sources"],
    boost: { sources: 5 },
    prefix: true,
    combineWith: "OR",
  }) as unknown as RawResult[];

  const fulltextResults = ms.search(q, {
    fields: ["body", "description"],
    boost: { description: 3, body: 1 },
    prefix: true,
    combineWith: "OR",
  }) as unknown as RawResult[];

  const fuzzyResults = ms.search(q, {
    fields: ["title", "spdx_id", "sources", "description", "body"],
    boost: { title: 10, spdx_id: 8, sources: 5, description: 3, body: 1 },
    fuzzy: 0.2,
    prefix: true,
    combineWith: "OR",
  }) as unknown as RawResult[];

  const seen = new Set<string>();
  const groups: SearchGroup[] = [];

  function addGroup(key: string, raw: RawResult[]) {
    const deduped = rankResults(q, raw).filter((r) => !seen.has(r.id));
    deduped.forEach((r) => seen.add(r.id));
    if (deduped.length > 0) {
      groups.push({
        key,
        results: deduped.map((r) => ({
          slug: r.slug,
          title: r.title,
          spdx_id: r.spdx_id,
          type: r.type,
          score: r.score,
        })),
      });
    }
  }

  addGroup("name", nameResults);
  addGroup("source", sourceResults);
  addGroup("fulltext", fulltextResults);
  addGroup("fuzzy", fuzzyResults);

  return groups;
}
