/* Standalone preview of the particle hero, so the component can be viewed and
   tuned without mounting it over the chat home view.

   Both sections sit inside one VortexScene, which owns a single fixed canvas
   behind them. Clicking the hero bursts the field and scrolls down; as the
   second section rises, the same particles collect out of the scatter into the
   terrain. They are never handed off between two canvases — it is one field
   throughout, morphing between two target forms. */

"use client";

import VortexScene from "../components/VortexScene";
import HeroVortex from "../components/HeroVortex";
import { color, font, radius } from "../theme";

/* Mirrors HomeView's QUICK_CARDS. Kept local rather than imported: HomeView is
   a "use client" module, so a server component gets a client reference for its
   exports and mapping over one throws at render time. */
const CARDS = [
  { key: "heart", kicker: "EMERGENCY",   tint: color.urgent,    title: "Warning signs of a heart attack", sub: "Also: stroke, high fever, anaphylaxis" },
  { key: "nsaid", kicker: "MEDICATIONS", tint: color.accentMid, title: "Ibuprofen vs acetaminophen",       sub: "Also: antihistamines, steroid effects" },
  { key: "chol",  kicker: "EVERYDAY",    tint: color.steady,    title: "Lowering cholesterol naturally",   sub: "Also: exercise targets, sodium and BP" },
];

const mono = {
  fontFamily: font.mono,
  fontSize: 9,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
};

const DUNE_READOUT = [
  { key: "FORM", value: "TRAVELLING SWELL" },
  { key: "SHADING", value: "SLOPE / CREST" },
  { key: "LENS", value: "SHALLOW FOCUS" },
];

export default function HeroPreviewPage() {
  return (
    // The scene owns the morph axis and the advance: each id is a stop on it.
    <VortexScene sections={["hero-next", "hero-third"]} background={color.ink}>
      <HeroVortex renderCanvas={false} />

      {/* Where the hero's click lands, and where the scattered particles
          reassemble. A full viewport tall so the morph completes exactly as it
          fills the screen. */}
      <section
        id="hero-next"
        style={{
          position: "relative",
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "clamp(40px, 7vh, 76px) clamp(20px, 5vw, 48px)",
        }}
      >
        {/* Type sits top and bottom; the middle band is left to the terrain. */}
        <div style={{ maxWidth: 540 }}>
          <div style={{ ...mono, color: color.textFaint, marginBottom: 16 }}>
            02 / START HERE
          </div>
          <h2
            style={{
              fontFamily: font.display,
              fontWeight: 300,
              fontSize: "clamp(26px, 4vw, 40px)",
              lineHeight: 1.14,
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow: "0 2px 40px rgba(0,0,0,0.9)",
            }}
          >
            Ask about a symptom,
            <br />
            <em style={{ fontStyle: "italic", color: color.textDim }}>
              a medication, or a habit.
            </em>
          </h2>
          <p
            style={{
              margin: "18px 0 0",
              maxWidth: 420,
              fontSize: 14,
              lineHeight: 1.7,
              color: color.textMuted,
              textShadow: "0 2px 30px rgba(0,0,0,0.95)",
            }}
          >
            Every answer comes back with its sources attached. General health
            information only — not a diagnosis.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {CARDS.map((c) => (
            <a
              key={c.key}
              href="/"
              style={{
                display: "block",
                padding: "18px 20px",
                borderRadius: radius.lg,
                border: `1px solid ${color.borderCard}`,
                // Translucent, so the terrain reads through the cards instead
                // of being boxed out by them.
                background: "rgba(12,14,22,0.72)",
                backdropFilter: "blur(6px)",
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  fontFamily: font.mono,
                  fontSize: 9,
                  letterSpacing: "0.14em",
                  color: c.tint,
                  marginBottom: 10,
                }}
              >
                {c.kicker}
              </div>
              <div style={{ fontSize: 15, color: color.text, marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12.5, color: color.textFaint }}>{c.sub}</div>
            </a>
          ))}
        </div>
      </section>

      {/* Third stop. Crossing the boundary scatters the field again and it
          settles into the dune plane. */}
      <section
        id="hero-third"
        style={{
          position: "relative",
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "clamp(40px, 7vh, 76px) clamp(20px, 5vw, 48px)",
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ ...mono, color: color.textFaint, marginBottom: 16 }}>
            03 / DOWN ON THE SURFACE
          </div>
          <h2
            style={{
              fontFamily: font.display,
              fontWeight: 300,
              fontSize: "clamp(26px, 4vw, 40px)",
              lineHeight: 1.14,
              letterSpacing: "-0.02em",
              margin: 0,
              textShadow: "0 2px 40px rgba(0,0,0,0.9)",
            }}
          >
            Answers you can
            <br />
            <em style={{ fontStyle: "italic", color: color.textDim }}>
              actually read.
            </em>
          </h2>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <p
            style={{
              margin: 0,
              maxWidth: 380,
              fontSize: 13.5,
              lineHeight: 1.7,
              color: color.textMuted,
              textShadow: "0 2px 30px rgba(0,0,0,0.95)",
            }}
          >
            Plain language, sources attached, and a clear line between general
            information and medical advice. Ask about a symptom, a medication,
            or a habit — and get something you can act on or take to a
            clinician.
          </p>

          <div style={{ display: "grid", gap: 4 }}>
            {DUNE_READOUT.map((r) => (
              <div key={r.key} style={{ ...mono, display: "flex", gap: 10 }}>
                <span style={{ color: color.textMono2, minWidth: 58 }}>{r.key}</span>
                <span style={{ color: color.textFaint }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </VortexScene>
  );
}
