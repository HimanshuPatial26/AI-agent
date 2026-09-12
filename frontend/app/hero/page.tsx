/* Standalone preview of the particle hero, so the component can be viewed and
   tuned without mounting it over the chat home view.

   Clicking the field bursts the particles and scrolls to the section below at
   the same time — `advanceToId` is the whole wiring. */

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

export default function HeroPreviewPage() {
  return (
    <>
      <HeroVortex
        advanceToId="hero-next"
        actions={
          <>
            <a
              href="/"
              style={{
                padding: "11px 22px",
                borderRadius: radius.pill,
                background: color.text,
                color: color.ink,
                fontSize: 13.5,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ask a question
            </a>
            <a
              href="#hero-next"
              style={{
                padding: "11px 22px",
                borderRadius: radius.pill,
                border: `1px solid ${color.borderInput}`,
                color: color.textDim,
                fontSize: 13.5,
                fontFamily: font.body,
                textDecoration: "none",
              }}
            >
              How it works
            </a>
          </>
        }
      />

      {/* Where the hero's click lands. A full viewport tall, so the scroll
          finishes with the hero completely out of frame. */}
      <section
        id="hero-next"
        style={{
          minHeight: "100svh",
          background: color.ink,
          color: color.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "clamp(64px, 12vh, 120px) clamp(20px, 5vw, 48px)",
          borderTop: `1px solid ${color.border}`,
        }}
      >
        <div style={{ width: "100%", maxWidth: 880 }}>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: color.textFaint,
              marginBottom: 20,
            }}
          >
            02 / START HERE
          </div>
          <h2
            style={{
              fontFamily: font.display,
              fontWeight: 300,
              fontSize: "clamp(28px, 4.4vw, 44px)",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: 0,
              maxWidth: 620,
            }}
          >
            Ask about a symptom, a medication, or a habit.
          </h2>
          <p
            style={{
              margin: "18px 0 0",
              maxWidth: 560,
              fontSize: 15,
              lineHeight: 1.7,
              color: color.textMuted,
            }}
          >
            Every answer comes back with its sources attached. General health
            information only — not a diagnosis.
          </p>

          <div
            style={{
              marginTop: 48,
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
                  background: color.surfaceCard,
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
        </div>
      </section>
    </>
  );
}
