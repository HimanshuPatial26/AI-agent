"use client";

import { useEffect, useRef, useState } from "react";
import { color, font } from "../theme";
import type { ModelInfo } from "../types";

interface HeaderProps {
  eyebrow:          string;
  showBorder:       boolean;
  models:           ModelInfo[];
  selected:         string;
  rateLimited:      Set<string>;
  onSelect:         (id: string) => void;
  onToggleSidebar:  () => void;
}

export default function Header({ eyebrow, showBorder, models, selected, rateLimited, onSelect, onToggleSidebar }: HeaderProps) {
  return (
    <div
      className="mp-header"
      style={{
        height: 58, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 26px", position: "relative", zIndex: 3, gap: 12,
        borderBottom: `1px solid ${showBorder ? color.border : "transparent"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <button
          className="mp-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle menu"
          style={{ border: "none", background: "transparent", color: color.textFaint, cursor: "pointer", padding: 4, alignItems: "center", flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.2em", color: color.textGhost, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {eyebrow}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <ModelSelector models={models} selected={selected} rateLimited={rateLimited} onSelect={onSelect} />
        <svg width="15" height="15" viewBox="0 0 24 24" fill={color.textMono}>
          <circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" />
        </svg>
      </div>
    </div>
  );
}

function ModelSelector({ models, selected, rateLimited, onSelect }: {
  models:      ModelInfo[];
  selected:    string;
  rateLimited: Set<string>;
  onSelect:    (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref     = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === selected) ?? models[0];
  const limited = current ? rateLimited.has(current.id) : false;

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!current) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          border: `1px solid ${limited ? "rgba(232,163,61,0.4)" : color.borderFaint}`,
          background: limited ? "rgba(232,163,61,0.08)" : "rgba(17,22,35,0.7)",
          borderRadius: 999, padding: "6px 13px", cursor: "pointer", transition: "border-color .15s",
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: limited ? color.caution : "#3FBFA4", boxShadow: `0 0 8px ${limited ? color.caution : "#3FBFA4"}` }} />
        <span style={{ fontFamily: font.mono, fontSize: 11, color: limited ? color.caution : "#A8B0C4", whiteSpace: "nowrap" }}>{current.label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color.textMono} strokeWidth={2.6} style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" />
        </svg>
      </div>

      {open && (
        <div
          className="animate-fade-in"
          style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", width: 240, borderRadius: 16,
            border: `1px solid ${color.borderInput}`, background: "rgba(9,11,18,0.97)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)", overflow: "hidden", zIndex: 50,
          }}
        >
          <p style={{ padding: "12px 14px 6px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: color.textMono2, fontFamily: font.mono, fontWeight: 600, margin: 0 }}>
            Select model
          </p>
          <div style={{ padding: "0 6px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
            {models.map((m) => {
              const isLimited = rateLimited.has(m.id);
              const isActive  = m.id === selected;
              return (
                <button
                  key={m.id}
                  onClick={() => { if (!isLimited) { onSelect(m.id); setOpen(false); } }}
                  disabled={isLimited}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 10px",
                    borderRadius: 10, textAlign: "left", border: "none", cursor: isLimited ? "not-allowed" : "pointer",
                    background: isActive && !isLimited ? "rgba(76,99,217,0.18)" : "transparent",
                    color: isLimited ? color.textMono : isActive ? color.text : color.textDim,
                    opacity: isLimited ? 0.5 : 1, fontFamily: font.body,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: m.provider === "Google" ? color.accentLight : color.caution }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{m.label}</p>
                    <p style={{ fontSize: 10, color: color.textMono, margin: 0 }}>{m.provider}</p>
                  </div>
                  {isLimited
                    ? <span style={{ fontSize: 10, color: color.caution, background: "rgba(232,163,61,0.1)", padding: "2px 6px", borderRadius: 999 }}>Unavailable</span>
                    : isActive
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color.accentMid} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
