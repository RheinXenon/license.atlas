import { Metadata } from "next";
import { Suspense } from "react";
import { TrackerClient } from "./tracker-client";

export const metadata: Metadata = {
  title: "OSI License Review Tracker — LicenseAtlas",
  description:
    "Every license the OSI board has reviewed: submissions, debates, sentiment, and board votes.",
};

// useSearchParams requires a Suspense boundary under static export (output: "export").
export default function TrackerPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20 text-center text-zinc-500">Loading...</div>}>
      <TrackerClient />
    </Suspense>
  );
}
