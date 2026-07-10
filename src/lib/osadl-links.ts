import type { OsadlLinkFile, OsadlNodeLink } from "./types";

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
