"use client";

import { useRef, useState } from "react";
import { color, font } from "../theme";

interface FloatingInputProps {
  value:            string;
  onChange:         (v: string) => void;
  onSend:           () => void;
  onStop:           () => void;
  loading:          boolean;
  quotaOut:         boolean;
  remaining:        number;
  limit:            number;
  sourcesOn:        boolean;
  onToggleSources:  () => void;
  plain:            boolean;
  onTogglePlain:    () => void;
}

export default function FloatingInput({
  value, onChange, onSend, onStop, loading, quotaOut, remaining, limit,
  sourcesOn, onToggleSources, plain, onTogglePlain,
}: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canSend = value.trim().length > 0 && !quotaOut;

  return (
    <div style={{ flexShrink: 0, padding: "0 32px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 11, position: "relative", zIndex: 2 }} className="safe-bottom">
      <div
        style={{
          width: "100%", maxWidth: 900, border: `1px solid ${focused ? color.accent : color.borderInput}`,
          borderRadius: 20, background: "linear-gradient(180deg,rgba(19,25,39,0.94),rgba(11,14,23,0.97))",
          boxShadow: "0 -1px 0 rgba(255,255,255,0.05) inset, 0 18px 50px rgba(0,0,0,0.55)",
          overflow: "hidden", transition: "border-color 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 18px 4px 20px" }}>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSend(); } }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={quotaOut}
            placeholder={quotaOut ? "Demo limit reached for this session" : "Describe a symptom, or name a medication"}
            style={{
              flex: 1, minWidth: 0, background: "transparent", border: "none", color: color.text,
              fontSize: 15.5, lineHeight: 1.5, padding: "2px 0", fontFamily: font.body, outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 14px 18px", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Chip
              active={sourcesOn}
              onClick={onToggleSources}
              activeColor={color.accentLight}
              label={sourcesOn ? "SOURCES ON" : "SOURCES OFF"}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={sourcesOn ? color.accentLight : color.textGhost} strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18" />
                </svg>
              }
            />
            <Chip
              active={plain}
              onClick={onTogglePlain}
              activeColor={color.steady}
              label={plain ? "PLAIN LANGUAGE" : "CLINICAL DETAIL"}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plain ? color.steady : color.textGhost} strokeWidth={2} strokeLinecap="round">
                  <path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v13l4-4h12a2 2 0 0 0 2-2Z" />
                </svg>
              }
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <span style={{ fontFamily: font.mono, fontSize: 10, color: color.textMono2, letterSpacing: "0.08em" }}>⏎ SEND</span>
            {loading ? (
              <span
                onClick={onStop}
                style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(248,113,113,0.16)", display: "grid", placeItems: "center", cursor: "pointer" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#f87171"><rect x="6" y="6" width="12" height="12" rx="2.5" /></svg>
              </span>
            ) : (
              <span
                onClick={() => { if (canSend) onSend(); }}
                style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: canSend ? "linear-gradient(160deg,#A9BEFF,#6E8BFF)" : color.borderSoft,
                  display: "grid", placeItems: "center", cursor: canSend ? "pointer" : "not-allowed",
                  boxShadow: canSend ? "0 4px 14px rgba(76,99,217,0.4)" : "none", transition: "all 0.2s ease",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={canSend ? "#0A0E1C" : color.textMono} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </span>
            )}
          </div>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 12.5, color: color.textFaint, textAlign: "center" }}>
        General health information only — not a diagnosis. Consult a qualified professional for personal medical advice.
        {" "}({remaining} of {limit} messages left this session)
      </p>
    </div>
  );
}

function Chip({ active, onClick, activeColor, label, icon }: { active: boolean; onClick: () => void; activeColor: string; label: string; icon: React.ReactNode }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, fontFamily: font.mono, fontSize: 10.5,
        letterSpacing: "0.06em", color: active ? activeColor : color.textGhost,
        background: active ? `${activeColor}24` : "transparent",
        border: `1px solid ${active ? `${activeColor}55` : color.borderFaint}`,
        borderRadius: 8, padding: "6px 10px", cursor: "pointer", transition: "all 0.18s ease",
      }}
    >
      {icon}
      {label}
    </span>
  );
}
