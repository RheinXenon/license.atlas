"use client";

import { useLang } from "@/lib/i18n";
import stats from "@/data/stats.json";
import trackerIndex from "@/data/tracker-index.json";

const sources = [
  ["SPDX", "about.src.spdx"],
  ["OSI", "about.src.osi"],
  ["TLDRLegal", "about.src.tldrlegal"],
  ["choosealicense.com", "about.src.choosealicense"],
  ["GitHub", "about.src.github"],
  ["HuggingFace Hub", "about.src.huggingface"],
  ["Open Data Commons", "about.src.odc"],
  ["FSF / GNU", "about.src.fsf"],
  ["Creative Commons", "about.src.cc"],
  ["RAIL", "about.src.rail"],
  ["OpenAtom Foundation", "about.src.openatom"],
  ["ScanCode LicenseDB", "about.src.scancode"],
  ["Blue Oak Council", "about.src.blueoak"],
  ["OpenMDW", "about.src.openmdw"],
  ["OSI Review Tracker", "about.src.osiTracker"],
] as const;

const popSources = [
  ["HuggingFace Hub", "about.pop.hf"],
  ["GitHub", "about.pop.gh"],
  ["Kaggle", "about.pop.kg"],
] as const;

const roadmapKeys = ["about.roadmap.compare", "about.roadmap.guides"] as const;

const statItems = [
  { value: String(stats.by_type.software), key: "about.stats.software" },
  { value: String(stats.by_type.model), key: "about.stats.model" },
  { value: String(stats.by_type.data), key: "about.stats.data" },
  { value: String(stats.by_type.agent), key: "about.stats.agent" },
  { value: String(stats.by_type.terms), key: "about.stats.terms" },
];

export default function AboutPage() {
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
        {t("about.title")}
      </h1>

      <div className="space-y-6 text-zinc-600 dark:text-zinc-400">
        <p>
          {t("about.intro", { total: String(stats.total) })}
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {statItems.map((s) => (
            <div
              key={s.key}
              className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-700"
            >
              <div className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">{s.value}</div>
              <div className="text-sm">{t(s.key)}</div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{t("about.sourcesTitle")}</h2>
        <p>{t("about.sourcesIntro")}</p>
        <ul className="list-disc space-y-1 pl-6">
          {sources.map(([name, key]) => (
            <li key={name}>
              <strong>{name}</strong> — {t(key)}
            </li>
          ))}
        </ul>

        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{t("about.reviewTitle")}</h2>
        <p>
          {t("about.reviewIntro", {
            total: String(trackerIndex._meta.total_submissions),
            approved: String(trackerIndex._meta.by_status.approved),
            rejected: String(trackerIndex._meta.by_status.rejected),
            pending: String(trackerIndex._meta.by_status.pending),
          })}
        </p>

        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{t("about.popTitle")}</h2>
        <p>{t("about.popIntro")}</p>
        <ul className="list-disc space-y-1 pl-6">
          {popSources.map(([name, key]) => (
            <li key={name}>
              <strong>{name}</strong> — {t(key)}
            </li>
          ))}
        </ul>
        <p>{t("about.popNote")}</p>

        <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{t("about.roadmapTitle")}</h2>
        <ul className="list-disc space-y-1 pl-6">
          {roadmapKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>

        {/* Creator & Links */}
        <div className="mt-10 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-700 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">{t("about.createdBy")}</span>
            <a
              href="https://www.modelgo.li/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-zinc-700 transition-colors hover:text-violet-600 dark:text-zinc-300 dark:hover:text-violet-400"
            >
              ModelGo
            </a>
          </div>
          <a
            href="https://scholar.google.com/citations?user=vEWocfwAAAAJ"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("about.scholarAlt")}
            className="inline-flex items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 24a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm0-24L0 9.5l4.838 3.94A8 8 0 0 1 12 9a8 8 0 0 1 7.162 4.44L24 9.5z"/>
            </svg>
            {t("about.scholarAlt")}
          </a>
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            <span>{t("about.poweredBy")}</span>
            <a
              href="https://z.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <img src="/license.atlas/zai-logo.webp" alt="Z.ai" className="h-4 w-4 rounded-sm" />
              <span className="font-medium text-zinc-500 dark:text-zinc-400">GLM 5.1</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
