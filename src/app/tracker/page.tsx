import { Metadata } from "next";
import { Suspense } from "react";
import { TrackerClient } from "./tracker-client";
import { TrackerPageFallback } from "@/components/tracker/tracker-page-fallback";

export const metadata: Metadata = {
  title: "License Review Tracker — LicenseAtlas",
  description:
    "Every license reviewed by OSI: submissions, debates, sentiment, and board votes.",
};

// useSearchParams requires a Suspense boundary under static export (output: "export").
export default function TrackerPage() {
  return (
    <Suspense fallback={<TrackerPageFallback />}>
      <TrackerClient />
    </Suspense>
  );
}
