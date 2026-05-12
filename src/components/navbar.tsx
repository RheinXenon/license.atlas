"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/i18n";

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:text-[#7c3aed] dark:text-zinc-400 dark:hover:text-[#a78bfa]"
      aria-label="Toggle dark mode"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

export function Navbar() {
  const { lang, setLang, t } = useLang();

  return (
    <header className="sticky top-0 z-[100] border-b border-zinc-200/60 bg-white/70 backdrop-blur-lg dark:border-zinc-800/60 dark:bg-zinc-950/70">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          <svg width="24" height="24" viewBox="0 0 32 32" className="shrink-0">
            <defs><linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#06b6d4"/></linearGradient></defs>
            <rect width="32" height="32" rx="8" fill="url(#logo-bg)"/>
            <text x="16" y="21.5" textAnchor="middle" fontFamily="system-ui,-apple-system,sans-serif" fontWeight="800" fontSize="14" fill="white" letterSpacing="-0.5">LA</text>
          </svg>
          <span className="bg-gradient-to-r from-[#7c3aed] to-zinc-950 bg-clip-text text-transparent dark:to-zinc-50">LicenseAtlas</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="text-zinc-600 transition-colors hover:text-[#7c3aed] dark:text-zinc-400 dark:hover:text-[#a78bfa]"
          >
            {t("nav.browse")}
          </Link>
          <Link
            href="/about"
            className="text-zinc-600 transition-colors hover:text-[#7c3aed] dark:text-zinc-400 dark:hover:text-[#a78bfa]"
          >
            {t("nav.about")}
          </Link>
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="rounded-lg px-1.5 py-0.5 text-xs font-bold text-zinc-500 transition-colors hover:text-[#7c3aed] dark:text-zinc-400 dark:hover:text-[#a78bfa]"
            aria-label={t("lang.switchTo")}
          >
            {lang === "en" ? "中" : "EN"}
          </button>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
