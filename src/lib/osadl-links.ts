import type {
  License,
  OsadlChecklistEntry,
  OsadlLinkFile,
  OsadlLinksIndex,
  OsadlNodeLink,
} from "./types";

export interface OsadlSourceContext {
  linkData: OsadlLinkFile | null;
  licenseBody: string;
  sourceSlug: string;
}

/**
 * Resolve link data together with the exact license body its character offsets
 * were generated against.
 *
 * Deprecated SPDX pages such as GPL-2.0 resolve to the current GPL-2.0-only
 * OSADL checklist. Their stored text is formatted differently, so reusing only
 * the canonical link data would point at incorrect character offsets. When a
 * page has no direct link record, fall back to the canonical SPDX page's link
 * record and body as one inseparable pair.
 */
export function resolveOsadlSourceContext(
  license: Pick<License, "slug" | "body">,
  entry: OsadlChecklistEntry | null,
  linksIndex: OsadlLinksIndex,
  getLicenseBySlug: (slug: string) => Pick<License, "slug" | "body"> | undefined,
): OsadlSourceContext {
  const directLinkData = linksIndex.by_slug[license.slug];
  if (directLinkData) {
    return {
      linkData: directLinkData,
      licenseBody: license.body,
      sourceSlug: license.slug,
    };
  }

  const canonicalSlug = entry?.spdx_id.trim().toLowerCase();
  const canonicalLinkData = canonicalSlug
    ? linksIndex.by_slug[canonicalSlug]
    : undefined;
  const canonicalLicense = canonicalSlug
    ? getLicenseBySlug(canonicalSlug)
    : undefined;

  if (canonicalSlug && canonicalLinkData && canonicalLicense) {
    return {
      linkData: canonicalLinkData,
      licenseBody: canonicalLicense.body,
      sourceSlug: canonicalSlug,
    };
  }

  return {
    linkData: null,
    licenseBody: license.body,
    sourceSlug: license.slug,
  };
}

/** Resolve the earliest license-text range for one checklist node. */
export function resolveFirstOsadlSource(
  linkData: OsadlLinkFile,
  nodeKey: string,
): OsadlNodeLink | null {
  const spans = linkData.node_links[nodeKey];
  if (!spans?.length) return null;
  return spans.reduce((first, span) => (
    span.startChar < first.startChar ? span : first
  ));
}
