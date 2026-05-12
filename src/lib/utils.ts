export function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function searchLicenses(
  licenses: { title: string; spdx_id: string }[],
  query: string
) {
  const q = query.toLowerCase().trim();
  if (!q) return licenses;
  return licenses.filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      l.spdx_id.toLowerCase().includes(q)
  );
}
