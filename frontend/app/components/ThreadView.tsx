"use client";

import { useEffect, useRef, useState } from "react";
import { color, font } from "../theme";
import type { ChatMessage, Source } from "../types";
import MarkdownMessage from "./MarkdownMessage";

const STAGES = ["READING QUESTION", "CONSULTING SOURCES", "CHECKING SAFETY RULES"];

const AiAvatar = ({ thinking }: { thinking?: boolean }) => (
  <div
    style={{
      width: 30, height: 30, flexShrink: 0, borderRadius: 9, background: "#12172A",
      border: `1px solid ${color.borderInput}`, display: "grid", placeItems: "center",
      animation: thinking ? "mp-beat 0.95s ease-in-out infinite" : undefined,
    }}
  >
    <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
      <path d="M4 17.5h4.4L11 9l2.9 13.4 2.5-7.2 1.8 3.3H28" stroke={thinking ? color.violet : color.accentLight} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="11" cy="9" r="2" fill={thinking ? "#D6C8FF" : "#DCE6FF"} style={!thinking ? { animation: "mp-node 2.4s ease-in-out infinite" } : undefined} />
    </svg>
  </div>
);

const CALLOUT_STYLES: Record<string, { bg: string; border: string; text: string; icon: JSX.Element }> = {
  urgent: {
    bg: color.urgentBg, border: color.urgentBorder, text: "#F3AEB6",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6B7A" strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 2 }}>
        <circle cx="12" cy="12" r="9" /><path d="M12 7.5v5" strokeLinecap="round" /><circle cx="12" cy="16.4" r="0.7" fill="#FF6B7A" />
      </svg>
    ),
  },
  caution: {
    bg: color.cautionBg, border: color.cautionBorder, text: "#E5C68F",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E8A33D" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M12 3l9 16H3z" strokeLinejoin="round" /><path d="M12 9v5" strokeLinecap="round" />
      </svg>
    ),
  },
  steady: {
    bg: color.steadyBg, border: color.steadyBorder, text: "#93D7C7",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3FBFA4" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }}>
        <circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

interface ThreadViewProps {
  messages:      ChatMessage[];
  thinking:      boolean;
  searching:     boolean;
  sourcesOn:     boolean;
  onOpenSource:  (s: Source) => void;
  onVote:        (index: number, vote: "up" | "down") => void;
  onCopy:        (index: number) => void;
  copiedIndex:   number | null;
}

export default function ThreadView({ messages, thinking, searching, sourcesOn, onOpenSource, onVote, onCopy, copiedIndex }: ThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, thinking]);

  useEffect(() => {
    if (!thinking) { setStage(0); return; }
    if (searching) { setStage(1); return; }
    const t = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 620);
    return () => clearInterval(t);
  }, [thinking, searching]);

  return (
    <div ref={scrollRef} className="mp-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "34px 32px 20px", minHeight: 0, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
        {messages.map((m, i) => (
          <div key={i} className="animate-message-in">
            {m.role === "user" ? (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ maxWidth: "76%", background: color.userBubbleBg, border: `1px solid ${color.userBubbleBorder}`, borderRadius: "16px 16px 5px 16px", padding: "13px 17px", fontSize: 15, lineHeight: 1.55, color: color.text, whiteSpace: "pre-wrap" }}>
                  {m.content}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 14 }}>
                <AiAvatar />
                <div style={{ display: "flex", flexDirection: "column", gap: 15, minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15.5, lineHeight: 1.7, color: color.textDim }}>
                    <MarkdownMessage content={m.content} streaming={m.streaming} />
                  </div>

                  {!m.streaming && m.safety && m.safety.tone !== "none" && m.safety.callout && (
                    <div className="animate-fade-in" style={{ display: "flex", gap: 11, alignItems: "flex-start", background: CALLOUT_STYLES[m.safety.tone].bg, border: `1px solid ${CALLOUT_STYLES[m.safety.tone].border}`, borderLeft: `3px solid ${m.safety.tone === "urgent" ? color.urgent : m.safety.tone === "caution" ? color.caution : color.steady}`, borderRadius: 11, padding: "14px 16px" }}>
                      {CALLOUT_STYLES[m.safety.tone].icon}
                      <span style={{ fontSize: 13.5, lineHeight: 1.55, color: CALLOUT_STYLES[m.safety.tone].text }}>{m.safety.callout}</span>
                    </div>
                  )}

                  {!m.streaming && sourcesOn && m.sources && m.sources.length > 0 && (
                    <div className="animate-fade-in" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {m.sources.map((s, si) => (
                        <span
                          key={si}
                          onClick={() => onOpenSource(s)}
                          style={{ fontFamily: font.mono, fontSize: 10.5, color: color.accentLight, border: `1px solid ${color.borderInput}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", transition: "all .18s ease" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = color.accent; e.currentTarget.style.background = "rgba(76,99,217,0.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = color.borderInput; e.currentTarget.style.background = "transparent"; }}
                        >
                          {s.title || s.url}
                        </span>
                      ))}
                      <span style={{ fontFamily: font.mono, fontSize: 10.5, color: color.textMono }}>
                        · {m.sources.length} source{m.sources.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {!m.streaming && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: -4 }}>
                      <span
                        onClick={() => onVote(i, "up")}
                        title="Helpful"
                        style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, cursor: "pointer", border: `1px solid ${m.vote === "up" ? "#2A5A50" : color.borderSoft}`, background: m.vote === "up" ? "rgba(63,191,164,0.12)" : "transparent" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.vote === "up" ? color.steady : color.textMono} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M7 22V10l5-8 1.5 1.2a2 2 0 0 1 .6 2.1L13 10h5.5a2 2 0 0 1 2 2.4l-1.6 8A2 2 0 0 1 17 22H7Z" /></svg>
                      </span>
                      <span
                        onClick={() => onVote(i, "down")}
                        title="Not helpful"
                        style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, cursor: "pointer", border: `1px solid ${m.vote === "down" ? color.urgentBorder : color.borderSoft}`, background: m.vote === "down" ? "rgba(255,107,122,0.1)" : "transparent" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={m.vote === "down" ? color.urgent : color.textMono} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 2v12l-5 8-1.5-1.2a2 2 0 0 1-.6-2.1L11 14H5.5a2 2 0 0 1-2-2.4l1.6-8A2 2 0 0 1 7 2h10Z" /></svg>
                      </span>
                      <span
                        onClick={() => onCopy(i)}
                        style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.1em", color: color.textMono, border: `1px solid ${color.borderSoft}`, borderRadius: 8, padding: "7px 10px", cursor: "pointer" }}
                      >
                        {copiedIndex === i ? "COPIED" : "COPY"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div className="animate-message-in" style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <AiAvatar thinking />
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: color.violet, animation: "mp-dots 1.3s infinite" }} />
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: color.violet, animation: "mp-dots 1.3s 0.16s infinite" }} />
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: color.violet, animation: "mp-dots 1.3s 0.32s infinite" }} />
              <span style={{ fontFamily: font.mono, fontSize: 10.5, color: color.textGhost, marginLeft: 9, letterSpacing: "0.06em" }}>
                {STAGES[stage]}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
