"use client";

import dynamic from "next/dynamic";
import { color, font } from "../theme";

const GradientWaves = dynamic(() => import("./GradientWaves"), { ssr: false });

interface QuickCard {
  key:    string;
  kicker: string;
  tint:   string;
  title:  string;
  sub:    string;
  q:      string;
}

export const QUICK_CARDS: QuickCard[] = [
  { key: "heart", kicker: "EMERGENCY",   tint: color.urgent,     title: "Warning signs of a heart attack",       sub: "Also: stroke, high fever, anaphylaxis",       q: "What are the warning signs of a heart attack?" },
  { key: "nsaid", kicker: "MEDICATIONS", tint: color.accentMid,  title: "Ibuprofen vs acetaminophen",             sub: "Also: antihistamines, steroid effects",       q: "What is the difference between ibuprofen and acetaminophen?" },
  { key: "chol",  kicker: "EVERYDAY",    tint: color.steady,     title: "Lowering cholesterol naturally",         sub: "Also: exercise targets, sodium and BP",       q: "How can I lower my cholesterol naturally?" },
];

const PulseLogo = () => (
  <div style={{ position: "relative", zIndex: 1, width: 80, height: 80, display: "grid", placeItems: "center", marginBottom: 24 }}>
    <div style={{ position: "absolute", inset: "6px 6px 14px", border: `1.3px solid ${color.accent}`, borderRadius: 22, animation: "mp-ring 2.4s ease-out infinite" }} />
    <div style={{ animation: "mp-beat 2.4s ease-in-out infinite", display: "grid", placeItems: "center" }}>
      <svg width="56" height="60" viewBox="0 0 32 34" fill="none">
        <defs>
          <linearGradient id="hero-s" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3E56D6" /><stop offset="0.55" stopColor="#6E8BFF" /><stop offset="1" stopColor="#A98BFF" />
          </linearGradient>
          <linearGradient id="hero-l" x1="6" y1="16" x2="26" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5E7BF0" /><stop offset="0.6" stopColor="#9FC0FF" /><stop offset="1" stopColor="#C3B4FF" />
          </linearGradient>
          <radialGradient id="hero-f" cx="0.3" cy="0.1" r="1"><stop offset="0" stopColor="#1A2242" /><stop offset="1" stopColor="#0A0E1A" /></radialGradient>
        </defs>
        <path d="M10 2.5h12A7.5 7.5 0 0 1 29.5 10v10A7.5 7.5 0 0 1 22 27.5h-6.6l-5.9 4.4v-4.5A7.5 7.5 0 0 1 2.5 20V10A7.5 7.5 0 0 1 10 2.5Z" fill="url(#hero-f)" stroke="url(#hero-s)" strokeWidth={1.5} strokeLinejoin="round" />
        <circle cx="12" cy="9" r="5.4" fill="#8FB4FF" style={{ animation: "mp-halo 2.4s ease-in-out infinite", transformOrigin: "12px 9px" }} />
        <path id="hero-p" d="M6.5 16.6H10L12 9l2.6 12.4 2.3-6.8 1.6 3.1h6.5" stroke="url(#hero-l)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={44} strokeDashoffset={44} style={{ animation: "mp-trace 1.5s 0.25s ease-out forwards" }} />
        <circle cx="12" cy="9" r="1.6" fill="#DCE6FF" style={{ animation: "mp-node 2.4s ease-in-out infinite" }} />
        <circle r="1.15" fill="#C3B4FF" opacity={0.95}>
          <animateMotion dur="2.4s" repeatCount="indefinite" calcMode="linear">
            <mpath href="#hero-p" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  </div>
);

export default function HomeView({ onAsk }: { onAsk: (q: string) => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px 48px", position: "relative" }}>
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden",
          maskImage: "linear-gradient(180deg,#000 0%,#000 42%,rgba(0,0,0,0.6) 68%,transparent 94%)",
          WebkitMaskImage: "linear-gradient(180deg,#000 0%,#000 42%,rgba(0,0,0,0.6) 68%,transparent 94%)",
        }}
      >
        <GradientWaves
          horizonColor="#0B1026"
          waveColor="#4C63D9"
          crestColor="#A9BEFF"
          speed={0.3}
          amplitude={3.4}
          waveScale={0.55}
          waveRatio={0.9}
          swell={33}
          turbulence={21}
          tilt={1.16}
          zoom={1}
          height={5.5}
          fogDepth={30}
          detail="medium"
          brightness={1.15}
          opacity={0.72}
          mouseInteraction
          parallaxStrength={0.45}
          grain
          grainIntensity={0.04}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", position: "relative", zIndex: 1 }}>
        <PulseLogo />

        <h1
          style={{
            position: "relative", zIndex: 1, margin: "0 0 16px", fontFamily: font.display, fontWeight: 400,
            fontSize: "clamp(30px, 4.4vw, 44px)", lineHeight: 1.06, letterSpacing: "-0.025em", textAlign: "center",
            maxWidth: "22ch", textWrap: "balance" as any,
          }}
        >
          Look up anything about <span style={{ fontStyle: "italic", color: color.accentLight }}>your health</span>
        </h1>
        <p style={{ position: "relative", zIndex: 1, margin: "0 0 34px", fontSize: 15.5, lineHeight: 1.6, color: color.textFaint, textAlign: "center", maxWidth: "50ch", textWrap: "pretty" as any }}>
          Symptoms, medications, nutrition, general guidance — with sources attached to every answer.
        </p>

        <div className="mp-card-grid" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 900, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14, alignItems: "stretch" }}>
          {QUICK_CARDS.map((c) => (
            <div
              key={c.key}
              onClick={() => onAsk(c.q)}
              style={{
                border: `1px solid ${color.borderCard}`, borderRadius: 16, padding: "19px 20px",
                background: color.panel, display: "flex", flexDirection: "column", gap: 13,
                cursor: "pointer", minWidth: 0, transition: "border-color 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.tint; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = color.borderCard; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 14, height: 14, flexShrink: 0, borderRadius: 4, background: c.tint, opacity: 0.9 }} />
                <span style={{ fontFamily: font.mono, fontSize: 9.5, letterSpacing: "0.18em", color: c.tint }}>{c.kicker}</span>
              </div>
              <span style={{ fontFamily: font.display, fontSize: 17.5, lineHeight: 1.28, color: color.text }}>{c.title}</span>
              <span style={{ fontSize: 13, color: color.textGhost, lineHeight: 1.5, marginTop: "auto" }}>{c.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
