"use client";

import { useLang } from "@/lib/i18n";

export function Footer() {
  const { t } = useLang();

  return (
    <footer className="mt-auto border-t border-zinc-200 py-8 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
          <p>
            <span className="font-medium text-[#7c3aed]">License</span>Atlas
          </p>
          <p className="flex items-center gap-3 text-xs text-zinc-400">
            <span>
              <span id="busuanzi_value_site_pv" className="font-mono">-</span> {t("footer.views")}
            </span>
            <span className="h-3 w-px bg-zinc-300 dark:bg-zinc-700" />
            <span>
              <span id="busuanzi_value_site_uv" className="font-mono">-</span> {t("footer.visitors")}
            </span>
          </p>
        </div>
      </div>
      <script async src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js" />
    </footer>
  );
}
