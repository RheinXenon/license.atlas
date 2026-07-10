import React, { useEffect, useState } from "react";
import type { OsadlSourceHighlight } from "@/lib/types";

function stripMdEscapes(text: string): string {
  return text.replace(/\\([.!)(*_#[\]`~>|])/g, "$1");
}

function renderInline(text: string, baseKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = baseKey * 1000;
  const regex = /(https?:\/\/[^\s)<>"']+)|(\*\*(.+?)\*\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1]) {
      parts.push(
        <a
          key={key++}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7c3aed] hover:underline"
        >
          {match[1]}
        </a>
      );
    } else if (match[2]) {
      parts.push(<strong key={key++}>{match[3]}</strong>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function lineIntersectsHighlight(
  lineStart: number,
  lineEnd: number,
  highlight: OsadlSourceHighlight | null,
): boolean {
  return !!highlight && lineStart < highlight.endChar && lineEnd > highlight.startChar;
}

export function LicenseBody({
  text,
  highlight = null,
}: {
  text: string;
  highlight?: OsadlSourceHighlight | null;
}) {
  const [flashingActivationId, setFlashingActivationId] = useState<number | null>(null);

  useEffect(() => {
    if (!highlight) {
      setFlashingActivationId(null);
      return;
    }
    setFlashingActivationId(highlight.activationId);
    const timer = window.setTimeout(() => setFlashingActivationId(null), 1200);
    return () => window.clearTimeout(timer);
  }, [highlight]);

  const rawLines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let lineStart = 0;
  let targetAttached = false;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const lineEnd = lineStart + rawLine.length;
    const line = stripMdEscapes(rawLine);
    const isHighlighted = lineIntersectsHighlight(lineStart, lineEnd, highlight);
    const isFlashing = isHighlighted && flashingActivationId === highlight?.activationId;
    const attachTarget = isHighlighted && !targetAttached;
    if (attachTarget) targetAttached = true;

    const sourceAttributes = attachTarget && highlight
      ? {
          "data-osadl-source-start": String(highlight.startChar),
          "data-osadl-source-clause": highlight.clauseId,
        }
      : {};
    const highlightClass = isHighlighted
      ? `osadl-source-highlight${isFlashing ? " osadl-source-highlight-flash" : ""}`
      : "";

    const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rest = headingMatch[2];
      const Tag = level === 1 ? "h3" : level === 2 ? "h4" : "h5";
      elements.push(
        React.createElement(
          Tag,
          {
            key: `h${i}`,
            className: `font-bold text-zinc-950 dark:text-zinc-50 mt-4 first:mt-0${highlightClass ? ` ${highlightClass}` : ""}`,
            ...sourceAttributes,
          },
          renderInline(rest, i)
        )
      );
    } else {
      elements.push(
        React.createElement(
          "span",
          {
            key: `l${i}`,
            className: highlightClass || undefined,
            ...sourceAttributes,
          },
          renderInline(line, i)
        )
      );
    }
    if (i < rawLines.length - 1) {
      elements.push("\n");
    }
    lineStart = lineEnd + 1;
  }

  return (
    <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {elements}
    </div>
  );
}
