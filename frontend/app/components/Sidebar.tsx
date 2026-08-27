"use client";

import { color, font } from "../theme";
import type { ConversationSummary } from "../types";

const LogoMark = ({ size = 21 }: { size?: number }) => (
  <div style={{ animation: "mp-beat 2.4s ease-in-out infinite", display: "grid", placeItems: "center" }}>
    <svg width={size} height={size * (22 / 21)} viewBox="0 0 32 34" fill="none">
      <defs>
        <linearGradient id="sb-s" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3E56D6" /><stop offset="0.55" stopColor="#6E8BFF" /><stop offset="1" stopColor="#A98BFF" />
        </linearGradient>
        <linearGradient id="sb-l" x1="6" y1="16" x2="26" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5E7BF0" /><stop offset="0.6" stopColor="#9FC0FF" /><stop offset="1" stopColor="#C3B4FF" />
        </linearGradient>
      </defs>
      <path d="M10 2.5h12A7.5 7.5 0 0 1 29.5 10v10A7.5 7.5 0 0 1 22 27.5h-6.6l-5.9 4.4v-4.5A7.5 7.5 0 0 1 2.5 20V10A7.5 7.5 0 0 1 10 2.5Z" fill="none" stroke="url(#sb-s)" strokeWidth={1.9} strokeLinejoin="round" />
      <path d="M6.5 16.6H10L12 9l2.6 12.4 2.3-6.8 1.6 3.1h6.5" stroke="url(#sb-l)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="9" r="1.7" fill="#DCE6FF" style={{ animation: "mp-node 2.4s ease-in-out infinite" }} />
    </svg>
  </div>
);

interface SidebarProps {
  conversations:        ConversationSummary[];
  conversationsLoading: boolean;
  activeConversationId: string | null;
  onNewEnquiry:         () => void;
  onOpenConversation:   (id: string) => void;
  used:                 number;
  limit:                number;
  open:                 boolean;
  onClose:              () => void;
}

export default function Sidebar({
  conversations, conversationsLoading, activeConversationId,
  onNewEnquiry, onOpenConversation, used, limit, open, onClose,
}: SidebarProps) {
  const quotaOut = used >= limit;
  const quotaPct = Math.min(100, Math.round((used / limit) * 100));

  return (
    <>
    {open && <div className="mp-sidebar-backdrop" onClick={onClose} />}
    <aside
      className={`mp-sidebar${open ? " mp-sidebar-open" : ""}`}
      style={{
        width: 236, flexShrink: 0, background: color.surface, borderRight: `1px solid ${color.border}`,
        display: "flex", flexDirection: "column", padding: "18px 14px", gap: 24,
        position: "sticky", top: 0, height: "100vh", boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px" }}>
        <LogoMark />
        <span style={{ fontFamily: font.display, fontSize: 17.5, letterSpacing: "-0.005em" }}>
          AI Med<span style={{ color: color.accentLight }}>-</span>pedia
        </span>
      </div>

      <button
        onClick={() => { onNewEnquiry(); onClose(); }}
        style={{
          display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 500,
          color: color.textDim, background: "linear-gradient(180deg,#161C2C,#111623)",
          border: `1px solid ${color.borderInput}`, borderRadius: 11, padding: "10px 13px",
          cursor: "pointer", textAlign: "left", fontFamily: font.body, transition: "border-color .15s, color .15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = color.accent; e.currentTarget.style.color = color.text; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = color.borderInput; e.currentTarget.style.color = color.textDim; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color.accentLight} strokeWidth={2.2} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        New enquiry
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, minHeight: 0, flex: 1 }}>
        <span style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: "0.2em", color: color.textMono2, padding: "0 6px" }}>
          RECENT
        </span>
        <div className="mp-scroll" style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
          {conversationsLoading && (
            <span style={{ fontFamily: font.mono, fontSize: 11, color: color.textMono, padding: "9px 11px" }}>Loading…</span>
          )}
          {!conversationsLoading && conversations.length === 0 && (
            <span style={{ fontSize: 12.5, color: color.textGhost, padding: "9px 11px", lineHeight: 1.5 }}>
              No enquiries yet
            </span>
          )}
          {conversations.map((c) => {
            const active = c.id === activeConversationId;
            return (
              <div
                key={c.id}
                onClick={() => { onOpenConversation(c.id); onClose(); }}
                style={{
                  fontSize: 13.5, padding: "9px 11px", borderRadius: 9, cursor: "pointer",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  display: "flex", alignItems: "center", gap: 8, background: "transparent",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#10151F"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {active && <span style={{ width: 3, height: 14, borderRadius: 2, background: color.accentMid, flexShrink: 0 }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", color: active ? color.textDim : color.textFaint }}>
                  {c.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ border: `1px solid ${color.borderSoft}`, borderRadius: 12, padding: 13, display: "flex", flexDirection: "column", gap: 9, background: color.surface2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: "0.16em", color: color.textMono }}>SESSION LIMIT</span>
            <span style={{ fontFamily: font.mono, fontSize: 11, color: color.accentLight }}>{used} / {limit}</span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: color.borderSoft, overflow: "hidden" }}>
            <div style={{ width: `${quotaPct}%`, height: "100%", background: `linear-gradient(90deg,${color.accent},${color.accentLight})`, transition: "width 0.4s ease" }} />
          </div>
          {quotaOut && (
            <span style={{ fontSize: 11.5, color: color.caution, lineHeight: 1.4 }}>
              Demo limit reached for this session.
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 6px" }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(160deg,#2A3B86,#141B3A)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, color: "#BFD2FF" }}>
            AI
          </span>
          <span style={{ fontSize: 13, color: color.textFaint }}>Guest session</span>
        </div>
      </div>
    </aside>
    </>
  );
}
