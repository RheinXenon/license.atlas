"use client";

import Link from "next/link";
import { Badge } from "@/components/badge";
import { LicenseBodySection } from "@/components/license-body-section";
import { useLang } from "@/lib/i18n";
import type { License } from "@/lib/types";

const LANG_NAMES: Record<string, string> = {
  en: "English", zh: "Chinese", "zh-hans": "Chinese (Simplified)", "zh-hant": "Chinese (Traditional)",
  ja: "Japanese", ko: "Korean", ar: "Arabic", de: "German", es: "Spanish", fr: "French",
  it: "Italian", pt: "Portuguese", ru: "Russian", nl: "Dutch", pl: "Polish",
  tr: "Turkish", sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish",
  el: "Greek", cs: "Czech", sk: "Slovak", sl: "Slovenian", hr: "Croatian",
  ro: "Romanian", hu: "Hungarian", uk: "Ukrainian", et: "Estonian", lv: "Latvian",
  lt: "Lithuanian", id: "Indonesian", eu: "Basque", fy: "Frisian", mi: "Maori",
};

function formatLanguages(languages: string[]): string[] {
  if (!languages || languages.length === 0) return [];
  if (languages.length === 1 && languages[0] === "en") return [];
  if (languages.length > 2) return ["Multilingual"];
  return languages.map((l) => LANG_NAMES[l] || l);
}

interface Props {
  license: License;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export function LicenseDetailClient({ license, prev, next }: Props) {
  const { t } = useLang();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* Nav */}
      <Link
        href="/"
        className="fade-in mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-[#7c3aed] dark:hover:text-[#a78bfa]"
      >
        &larr; {t("detail.allLicenses")}
      </Link>

      {/* Header */}
      <div className="fade-in-1 relative z-20 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {license.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          {license.spdx_id && (
            <span className="font-mono">SPDX ID: {license.spdx_id}</span>
          )}
          {license.created_at && (
            <span>{t("detail.added", { date: license.created_at })}</span>
          )}
        </div>

        {/* Badges — Terms entries (type=terms) only show type badge */}
        <div className="mt-4 flex flex-wrap gap-2">
          {license.type === "terms" ? (
            <Badge variant="type">{t("type.terms")}</Badge>
          ) : (
            <>
              <Badge variant="type">{license.type}</Badge>
              {license.osi_approved && <Badge variant="osi">{t("badge.osiApproved")}</Badge>}
              {license.fsf_libre && <Badge variant="fsf">{t("badge.fsfLibre")}</Badge>}
              {(license.fsf_tags || []).filter((t) => t !== "libre" && t !== "non-free").map((tag) => (
                <Badge key={tag} variant="fsf-tag">{tag.replace(/gpl|fdl/g, (m) => m.toUpperCase())}</Badge>
              ))}
              {formatLanguages(license.languages || []).map((lang) => (
                <Badge key={lang} variant="language">{lang}</Badge>
              ))}
              {license.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant={tag === "tl;drLegal Verified" ? "verified" : "tag"}
                >
                  {tag}
                </Badge>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Permissions / Conditions / Limitations */}
      {(license.permissions.length > 0 ||
        license.conditions.length > 0 ||
        license.limitations.length > 0) && (
        <div className="fade-in-2 mb-8 flex flex-wrap gap-6">
          {license.permissions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                {t("detail.permissions")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {license.permissions.map((p) => (
                  <Badge key={p} variant="permission">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {license.conditions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                {t("detail.conditions")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {license.conditions.map((c) => (
                  <Badge key={c} variant="condition">{c}</Badge>
                ))}
              </div>
            </div>
          )}
          {license.limitations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
                {t("detail.limitations")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {license.limitations.map((l) => (
                  <Badge key={l} variant="limitation">{l}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blue Oak Rating */}
      {license.blueoak_tier && (
        <div className="fade-in-2 mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
            {t("detail.blueOakRating")}
          </p>
          <div className="flex items-center gap-3">
            <Badge variant="tag">{license.blueoak_tier}</Badge>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {t(`detail.blueOak.${license.blueoak_tier.toLowerCase()}`)}
            </span>
          </div>
        </div>
      )}

      {/* License Text */}
      {license.body && (
        <div className="fade-in-3">
          <LicenseBodySection slug={license.slug} body={license.body} hasBodies={!!license.languages && license.languages.length > 1} />
        </div>
      )}

      {/* Sources */}
      {license.sources.length > 0 && (
        <div className="fade-in-4 mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {t("detail.sources")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {license.sources.map((s, i) => (
              <a
                key={`${s.name}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  s.merged
                    ? "rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-violet-300 hover:text-[#7c3aed] dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-500 dark:hover:border-violet-700 dark:hover:text-[#a78bfa]"
                    : "rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-violet-300 hover:text-[#7c3aed] dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-[#a78bfa]"
                }
              >
                {s.name} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Terms */}
      {license.terms && license.terms.length > 0 && (
        <div className="fade-in-4 mb-8">
          <h2 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {t("detail.terms")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {license.terms.map((term, i) => (
              term.slug ? (
                <Link
                  key={`${term.name}-${i}`}
                  href={`/licenses/${term.slug}`}
                  className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-violet-300 hover:text-[#7c3aed] dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-[#a78bfa]"
                >
                  {term.name}
                </Link>
              ) : (
                <a
                  key={`${term.name}-${i}`}
                  href={term.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:border-violet-300 hover:text-[#7c3aed] dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-violet-700 dark:hover:text-[#a78bfa]"
                >
                  {term.name} ↗
                </a>
              )
            ))}
          </div>
        </div>
      )}

      {/* Prev/Next */}
      <div className="fade-in-5 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {prev ? (
          <Link
            href={`/licenses/${prev.slug}`}
            className="max-w-[45%] truncate text-sm text-zinc-500 hover:text-[#7c3aed] dark:hover:text-[#a78bfa]"
          >
            &larr; {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/licenses/${next.slug}`}
            className="max-w-[45%] truncate text-right text-sm text-zinc-500 hover:text-[#7c3aed] dark:hover:text-[#a78bfa]"
          >
            {next.title} &rarr;
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
