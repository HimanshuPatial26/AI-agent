"use client";

import { color, font } from "../theme";
import type { Source } from "../types";

export default function SourceDrawer({ source, onClose }: { source: Source | null; onClose: () => void }) {
  if (!source) return null;

  return (
    <aside
      className="animate-fade-in"
      data-mp-drawer
      style={{
        width: 330, flexShrink: 0, background: color.surface, borderLeft: `1px solid ${color.border}`,
        height: "100vh", boxSizing: "border-box", padding: 20, display: "flex", flexDirection: "column",
        gap: 20, position: "sticky", top: 0, overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
          <span style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: "0.2em", color: color.textMono }}>SOURCE</span>
          <span style={{ fontFamily: font.display, fontSize: 21, lineHeight: 1.2, overflowWrap: "anywhere" }}>{source.title || "Untitled source"}</span>
        </div>
        <span
          onClick={onClose}
          style={{ display: "grid", placeItems: "center", width: 28, height: 28, borderRadius: 8, border: `1px solid ${color.borderFaint}`, cursor: "pointer", flexShrink: 0 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color.textFaint} strokeWidth={2.4} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </span>
      </div>
      <div style={{ height: 1, background: color.border }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: font.mono, fontSize: 11, color: color.accentLight, wordBreak: "break-all" }}
        >
          {source.url}
        </a>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: color.textMuted }}>
          {source.content || "No excerpt available for this source."}
        </p>
      </div>
      <div style={{ marginTop: "auto", border: `1px solid ${color.borderSoft}`, borderRadius: 12, padding: 14, background: color.surface2 }}>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: color.textGhost }}>
          Sources are surfaced for transparency. They describe populations, not individuals — your own history changes what applies.
        </p>
      </div>
    </aside>
  );
}
