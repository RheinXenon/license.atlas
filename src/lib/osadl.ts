import osadlIndexJson from "@/data/osadl-checklists-index.json";
import type { License, OsadlChecklistEntry, OsadlIndex, OsadlIndexMeta } from "@/lib/types";

const osadlIndex = osadlIndexJson as OsadlIndex;

function normSpdx(value: string | undefined) {
  return (value || "").trim().toLowerCase();
}

export const osadlMeta: OsadlIndexMeta = osadlIndex._meta;

export function resolveOsadlChecklist(
  license: Pick<License, "spdx_id">,
): OsadlChecklistEntry | null {
  const key = normSpdx(license.spdx_id);
  if (!key) return null;
  return osadlIndex.by_spdx[key] || null;
}
