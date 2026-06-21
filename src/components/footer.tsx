"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";
import stats from "@/data/stats.json";
import trackerMeta from "@/data/tracker-meta.json";
import osadlMeta from "@/data/osadl-meta.json";

export function Footer() {
  const { t, lang } = useLang();
  const [mounted, setMounted] = useState(false);

  function loadBusuanzi() {
    if (document.getElementById("busuanzi_script")) return;
    const s = document.createElement("script");
    s.id = "busuanzi_script";
    s.async = true;
    s.src = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
    document.body.appendChild(s);
  }

  useEffect(() => { setMounted(true); loadBusuanzi(); }, []);

  const brandName = mounted && lang === "zh"
    ? <span className="font-serif tracking-widest"><span className="font-medium text-[#7c3aed]">许可</span>图鉴</span>
    : <><span className="font-medium text-[#7c3aed]">License</span>Atlas</>;
  const statsUpdated = new Date(`${stats.updated}T00:00:00Z`);
  const trackerUpdated = new Date(trackerMeta.generated_at);
  const osadlUpdated = new Date(osadlMeta.generated_at);
  const latestUpdated = [statsUpdated, trackerUpdated, osadlUpdated]
    .reduce((latest, current) => current > latest ? current : latest);
  const updatedLabel = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(latestUpdated);

  return (
    <footer className="mt-auto border-t border-zinc-200 py-8 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
          <p>{brandName}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-400 sm:justify-end">
            <p>{t("footer.dataUpdatedAt", { date: updatedLabel })}</p>
            <span className="text-zinc-300 dark:text-zinc-700" aria-hidden="true">|</span>
            <p className="flex items-center gap-1">
              <span id="busuanzi_value_page_pv" className="font-mono">-</span> {t("footer.views")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
