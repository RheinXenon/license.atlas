import osadlIndexJson from "@/data/osadl-checklists-index.json";
import generatedOsadlIndexJson from "@/data/generated-osadl-checklists-v34-index.json";
import modelGeneratedOsadlIndexJson from "@/data/model-generated-osadl-checklists-v1-index.json";
import type { GeneratedOsadlIndex, License, OsadlChecklistEntry, OsadlIndex, OsadlIndexMeta } from "@/lib/types";

const osadlIndex = osadlIndexJson as OsadlIndex;
const generatedOsadlIndex = generatedOsadlIndexJson as GeneratedOsadlIndex;
const modelGeneratedOsadlIndex = modelGeneratedOsadlIndexJson as GeneratedOsadlIndex;

function normSpdx(value: string | undefined) {
  return (value || "").trim().toLowerCase();
}

// OSADL tracks current SPDX license-expression IDs. LicenseAtlas still keeps
// several deprecated SPDX IDs as canonical detail pages because they are common
// search targets. The deprecated GNU IDs without a suffix correspond to the
// modern "-only" form, not "-or-later".
const DEPRECATED_SPDX_OSADL_MAP: Record<string, string> = {
  "gpl-1.0": "gpl-1.0-only",
  "gpl-2.0": "gpl-2.0-only",
  "gpl-3.0": "gpl-3.0-only",
  "lgpl-2.0": "lgpl-2.0-only",
  "lgpl-2.1": "lgpl-2.1-only",
};

export const osadlMeta: OsadlIndexMeta = { ...osadlIndex._meta, source_kind: "official" };
export const generatedOsadlMeta: OsadlIndexMeta = generatedOsadlIndex._meta;
export const modelGeneratedOsadlMeta: OsadlIndexMeta = modelGeneratedOsadlIndex._meta;

export function resolveOsadlChecklist(
  license: Pick<License, "spdx_id" | "slug" | "type">,
): OsadlChecklistEntry | null {
  if (license.type === "model") return resolveModelGeneratedOsadlChecklist(license);
  const official = resolveOfficialOsadlChecklist(license);
  if (official) return official;
  const generated = resolveGeneratedOsadlChecklist(license);
  if (generated) return generated;
  return null;
}

export function resolveOsadlChecklistMeta(entry: OsadlChecklistEntry | null): OsadlIndexMeta {
  if (entry?.domain === "model") return modelGeneratedOsadlMeta;
  return entry?.source_kind === "generated" ? generatedOsadlMeta : osadlMeta;
}

function resolveOfficialOsadlChecklist(
  license: Pick<License, "spdx_id" | "slug">,
): OsadlChecklistEntry | null {
  const key = normSpdx(license.spdx_id);
  const slug = normSpdx(license.slug);
  const entry = (key && (osadlIndex.by_spdx[key] || osadlIndex.by_spdx[DEPRECATED_SPDX_OSADL_MAP[key]]))
    || osadlIndex.by_spdx[SCANCODE_SLUG_OSADL_MAP[slug]]
    || null;
  return entry ? { ...entry, source_kind: "official" } : null;
}

function resolveGeneratedOsadlChecklist(
  license: Pick<License, "spdx_id" | "slug">,
): OsadlChecklistEntry | null {
  const key = normSpdx(license.spdx_id);
  const slug = normSpdx(license.slug);
  const generatedSlug = (key && generatedOsadlIndex.by_spdx[key]) || slug;
  const entry = generatedSlug ? generatedOsadlIndex.by_slug[generatedSlug] : null;
  return entry ? { ...entry, source_kind: "generated" } : null;
}

function resolveModelGeneratedOsadlChecklist(
  license: Pick<License, "spdx_id" | "slug" | "type">,
): OsadlChecklistEntry | null {
  if (license.type !== "model") return null;
  const key = normSpdx(license.spdx_id);
  const slug = normSpdx(license.slug);
  const generatedSlug = (key && modelGeneratedOsadlIndex.by_spdx[key]) || slug;
  const entry = generatedSlug ? modelGeneratedOsadlIndex.by_slug[generatedSlug] : null;
  return entry ? { ...entry, source_kind: "generated", domain: "model" } : null;
}

const SCANCODE_SLUG_OSADL_MAP: Record<string, string> = {
  "bsla-no-advert": "licenseref-scancode-bsla-no-advert",
  "info-zip-2003-05": "licenseref-scancode-info-zip-2003-05",
  "ppp": "licenseref-scancode-ppp",
  "bzip2-libbzip-1.0.5": "bzip2-1.0.5",
};
