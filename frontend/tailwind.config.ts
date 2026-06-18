import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "lum-bg":           "#060912",
        "lum-surface":      "#0b1326",
        "lum-surface-lo":   "#101a30",
        "lum-surface-mid":  "#131b2e",
        "lum-surface-hi":   "#1c2740",
        "lum-surface-var":  "#2d3449",
        "lum-primary":      "#3b82f6",
        "lum-primary-dim":  "#5b9bff",
        "lum-primary-soft": "#7eb0ff",
        "lum-on-surface":   "#eef1fb",
        "lum-on-dim":       "#dfe5f3",
        "lum-muted":        "#aab4c9",
        "lum-faint":        "#9aa4ba",
        "lum-outline":      "rgba(255,255,255,0.08)",
        "lum-outline-blue": "rgba(96,165,250,0.2)",
      },
      fontFamily: {
        heading: ["Geist", "system-ui", "sans-serif"],
        body:    ["Anybody", "system-ui", "sans-serif"],
      },
      maxWidth: {
        chat: "800px",
      },
      keyframes: {
        "lum-rise": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "lum-pulse": {
          "0%":   { boxShadow: "0 0 0 0 rgba(59,130,246,0.5)" },
          "70%":  { boxShadow: "0 0 0 7px rgba(59,130,246,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(59,130,246,0)" },
        },
        "lum-glow": {
          "0%,100%": { opacity: "0.45" },
          "50%":     { opacity: "0.85" },
        },
        "message-in": {
          from: { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        wave: {
          "0%,60%,100%": { transform: "translateY(0)" },
          "30%":         { transform: "translateY(-5px)" },
        },
        "cursor-blink": {
          "0%,100%": { opacity: "1" },
          "50%":     { opacity: "0" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
        "shooting": {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(300px)" },
        },
        "tail": {
          "0%":   { width: "0" },
          "30%":  { width: "100px" },
          "100%": { width: "0" },
        },
        "shining": {
          "0%":   { width: "0" },
          "50%":  { width: "30px" },
          "100%": { width: "0" },
        },
      },
      animation: {
        "lum-rise":      "lum-rise 0.35s ease both",
        "lum-pulse":     "lum-pulse 2.4s infinite",
        "lum-glow":      "lum-glow 3.8s ease-in-out infinite",
        "message-in":    "message-in 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
        "fade-in":       "fade-in 0.25s ease-out forwards",
        wave:            "wave 1.3s ease-in-out infinite",
        "cursor-blink":  "cursor-blink 0.85s ease-in-out infinite",
        "spin-slow":     "spin 0.8s linear infinite",
        shooting:        "shooting 3000ms ease-in-out infinite",
        tail:            "tail 3000ms ease-in-out infinite",
        shining:         "shining 3000ms ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
