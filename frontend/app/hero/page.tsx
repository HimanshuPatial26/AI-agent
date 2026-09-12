/* Standalone preview of the particle hero, so the component can be viewed and
   tuned without mounting it over the chat home view. */

import HeroVortex from "../components/HeroVortex";
import { color, font, radius } from "../theme";

export default function HeroPreviewPage() {
  return (
    <HeroVortex
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
            href="/"
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
  );
}
