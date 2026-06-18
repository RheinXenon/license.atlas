"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { TrackerTimelineEvent, TrackerBoardVote } from "@/lib/types";

// Sentiment → parent tint color (mirrors KB SENT_TINT + SENT_COLOR).
const SENT_TINT: Record<string, string> = {
  positive: "positive", support: "positive",
  negative: "negative", oppose: "negative", critical: "negative",
  question: "question", mixed: "mixed", neutral: "neutral",
};
const SENT_HEX: Record<string, string> = {
  positive: "#10b981", negative: "#ef4444", question: "#8b5cf6",
};
const TYPE_COLOR: Record<string, string> = {
  board_decision: "var(--c-approved, #3DA639)",
  withdrawal: "var(--c-withdrawn, #d97706)",
  revision: "var(--c-superseded, #0284c7)",
  submission: "var(--c-approved, #3DA639)",
  feedback: "var(--c-legacy, #71717a)",
};

interface TipState {
  x: number; y: number;
  type: string; typeColor: string; stripeColor: string;
  date: string; sender: string; snip: string;
  submitter?: boolean; sentiment?: string;
}

export function TimelineStrip({
  timeline, submitter, vote, onNodeClick,
}: {
  timeline: TrackerTimelineEvent[];
  submitter: string;
  vote: TrackerBoardVote | null;
  onNodeClick?: (tab: string, idx: number) => void;
}) {
  const { lang } = useLang();
  const [tip, setTip] = useState<TipState | null>(null);
  void vote;

  const nodes = timeline.map((ev, i) => {
    const d = ev.date ? ev.date.slice(5, 10) : "?";
    const rawType = ev.type || "feedback";
    const label = rawType === "board_decision" ? "✓" : rawType === "withdrawal" ? "✗" : "";
    const typeLabel = rawType.replace(/_/g, " ");
    const colorKey =
      rawType === "board_decision" ? "board_decision"
      : rawType === "withdrawal" ? "withdrawal"
      : rawType === "revision" ? "revision"
      : rawType === "submission" ? "submission" : "feedback";
    const typeColor = TYPE_COLOR[colorKey];
    const sentiment = rawType === "feedback" && ev.sentiment ? ev.sentiment.toLowerCase() : "";
    const tint = SENT_TINT[sentiment] || "neutral";
    const sentClass = tint && tint !== "neutral" ? ` sent-${tint}` : "";
    const nodeHex = tint && tint !== "neutral" ? SENT_HEX[tint] : typeColor;
    const snip = (lang === "zh" ? ev.point_zh || ev.snippet : ev.snippet) || ev.subject || "";
    const isSubmitter = !!(submitter && ev.sender && ev.sender !== "Unknown" && ev.sender === submitter);
    const isLast = i >= timeline.length - 1;
    const crossesYear = !isLast && ev.date && timeline[i + 1].date &&
      ev.date.slice(0, 4) !== timeline[i + 1].date!.slice(0, 4);

    return (
      <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
        <span
          className={`tl-node ${rawType}${sentClass}${isSubmitter ? " tl-submitter" : ""}`}
          onMouseEnter={(e) => setTip({
            x: e.clientX, y: e.clientY,
            type: typeLabel, typeColor, stripeColor: nodeHex,
            date: ev.date || "?",
            sender: ev.sender && ev.sender !== "Unknown" ? ev.sender : "",
            snip, submitter: isSubmitter, sentiment,
          })}
          onMouseMove={(e) => tip && setTip({ ...tip, x: e.clientX, y: e.clientY })}
          onMouseLeave={() => setTip(null)}
          onClick={(e) => { e.stopPropagation(); onNodeClick?.("timeline", i); }}
        >
          {d}{label ? " " + label : ""}
        </span>
        {!isLast && (
          <span className={`tl-arrow${crossesYear ? " tl-cross-year" : ""}`}>
            {crossesYear ? "⇒" : "→"}
          </span>
        )}
      </span>
    );
  });

  return (
    <div className="timeline-strip">
      {nodes}
      {tip && (
        <div
          className="tl-tip show"
          style={{
            position: "fixed", left: tip.x + 14, top: tip.y + 14,
            borderColor: tip.stripeColor, zIndex: 9999,
            maxWidth: 340, pointerEvents: "none",
          }}
        >
          <div className="tt-head" style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="tt-type" style={{ color: tip.typeColor }}>
              {tip.type}
            </span>
            <span className="tt-date" style={{ color: "#94a3b8" }}>{tip.date}</span>
          </div>
          {tip.sender && <div className="tt-sender" style={{ fontWeight: 600 }}>👤 {tip.sender}</div>}
          <div className="tt-snip" style={{ color: "#64748b", whiteSpace: "pre-wrap" }}>{tip.snip}</div>
        </div>
      )}
    </div>
  );
}
