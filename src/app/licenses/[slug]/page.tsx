import { notFound } from "next/navigation";
import { LicenseDetailClient } from "./license-detail-client";
import licenses from "@/data/licenses.json";
import type { License } from "@/lib/types";

const allLicenses = licenses as License[];
const slugMap = new Map(
  allLicenses.map((l, i) => [l.slug, { license: l, index: i }])
);

export function generateStaticParams() {
  return allLicenses.map((l) => ({ slug: l.slug }));
}

export function generateMetadata({
  params: _params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return {
    title: "LicenseAtlas",
    description: "License details",
  };
}

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = slugMap.get(slug);
  if (!entry) notFound();

  const { license, index } = entry;
  const prev = index > 0 ? allLicenses[index - 1] : null;
  const next = index < allLicenses.length - 1 ? allLicenses[index + 1] : null;

  return (
    <LicenseDetailClient
      license={license}
      prev={prev ? { slug: prev.slug, title: prev.title } : null}
      next={next ? { slug: next.slug, title: next.title } : null}
    />
  );
}
