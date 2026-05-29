"use client";

import { useState, useEffect } from "react";
import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t, lang } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); loadBusuanzi(); }, []);

  function loadBusuanzi() {
    if (document.getElementById("busuanzi_script")) return;
    const s = document.createElement("script");
    s.id = "busuanzi_script";
    s.async = true;
    s.src = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
    document.body.appendChild(s);
  }

  const brandName = mounted && lang === "zh"
    ? <span className="font-serif tracking-widest"><span className="font-medium text-[#7c3aed]">许可</span>图鉴</span>
    : <><span className="font-medium text-[#7c3aed]">License</span>Atlas</>;

  return (
    <footer className="mt-auto border-t border-zinc-200 py-8 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
          <p>{brandName}</p>
          <p className="flex items-center gap-1 text-xs text-zinc-400">
            <span id="busuanzi_value_page_pv" className="font-mono">-</span> {t("footer.views")}
          </p>
        </div>
      </div>
    </footer>
  );
}
