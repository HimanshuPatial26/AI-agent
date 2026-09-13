/* Standalone preview of the particle hero, so the component can be viewed and
   tuned without mounting it over the chat home view.

   Both sections sit inside one VortexScene, which owns a single fixed canvas
   behind them. Clicking the hero bursts the field and scrolls down; as the
   second section rises, the same particles collect out of the scatter into the
   terrain. They are never handed off between two canvases — it is one field
   throughout, morphing between two target forms. */

"use client";

import dynamic from "next/dynamic";
import VortexScene from "../components/VortexScene";
import HeroVortex from "../components/HeroVortex";
import MountainHUD from "../components/MountainHUD";
import { color, font, radius } from "../theme";


// Its own WebGL context, so it only mounts on the client.
const ParticleMountain = dynamic(() => import("../components/ParticleMountain"), { ssr: false });

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
    <VortexScene
      sections={["hero-next", "hero-third"]}
      background={color.ink}
      // The mountain owns section 02, so the shared field stands down across it
      // and returns for the dunes. Both ends sit inside a handover.
      yieldRange={[0.62, 1.38]}
    >
      <HeroVortex renderCanvas={false} />

      {/* Where the hero's click lands, and where the scattered particles
          reassemble. A full viewport tall so the morph completes exactly as it
          fills the screen. */}
      <section
        id="hero-next"
        style={{ position: "relative", minHeight: "100svh", overflow: "hidden" }}
      >
        <ParticleMountain />
        <MountainHUD />

        {/* The foreground terrain runs straight through the copy, and a text
            shadow alone cannot hold a headline against a field of bright
            points. A soft scrim in that corner only. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background:
              [
                "linear-gradient(to top, rgba(5,7,10,0.96) 0%, rgba(5,7,10,0.72) 14%, transparent 34%)",
                "radial-gradient(62% 52% at 2% 92%, rgba(5,7,10,0.95), rgba(5,7,10,0.55) 46%, transparent 76%)",
              ].join(","),
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "clamp(20px, 5vw, 48px)",
            bottom: "clamp(40px, 7vh, 76px)",
            maxWidth: 440,
            zIndex: 3,
          }}
        >
          <div style={{ ...mono, color: color.textFaint, marginBottom: 14 }}>
            02 / GENERATIVE TERRAIN
          </div>
          <h2
            style={{
              fontFamily: font.display,
              fontWeight: 300,
              fontSize: "clamp(24px, 3.4vw, 36px)",
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
              margin: "16px 0 0",
              fontSize: 13,
              lineHeight: 1.7,
              color: color.textMuted,
              textShadow: "0 2px 30px rgba(0,0,0,0.95)",
            }}
          >
            Every answer comes back with its sources attached. General health
            information only — not a diagnosis.
          </p>
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
