/* AI Med-pedia design tokens — extracted from the Brand Board's "Deep Signal"
   palette and the Prototype's resolved literal values. Reuse these constants
   instead of introducing new hex values. */

export const color = {
  ink:        "#06070C",
  surface:    "#090B12",
  surface2:   "#0C1018",
  surfaceCard:"#0C0E16",
  panel:      "linear-gradient(180deg,rgba(20,26,40,0.72),rgba(12,16,24,0.72))",

  border:      "#14181F",
  borderCard:  "#1B2130",
  borderInput: "#232B42",
  borderHover: "#2C3760",
  borderSoft:  "#1A2030",
  borderFaint: "#1E2536",

  accent:      "#4C63D9",
  accentMid:   "#6E8BFF",
  accentLight: "#8FB4FF",
  violet:      "#A98BFF",
  violetLight: "#C3B4FF",

  steady:  "#3FBFA4",
  caution: "#E8A33D",
  urgent:  "#FF6B7A",

  text:      "#E8EAF2",
  textDim:   "#C8CEDE",
  textMuted: "#A8B0C4",
  textFaint: "#7C859B",
  textGhost: "#6B7488",
  textMono:  "#4A5266",
  textMono2: "#3D4557",

  userBubbleBg:     "#243057",
  userBubbleBorder: "#33417A",

  urgentBg:     "#1C0D12",
  urgentBorder: "#55222C",
  cautionBg:     "#1F1608",
  cautionBorder: "#4A3410",
  steadyBg:     "#0B1A18",
  steadyBorder: "#1E4740",
} as const;

export const font = {
  display: "'Newsreader', serif",
  body:    "'Instrument Sans', sans-serif",
  mono:    "'JetBrains Mono', monospace",
} as const;

export const radius = {
  sm: 8,
  md: 11,
  lg: 14,
  xl: 16,
  xxl: 20,
  pill: 999,
} as const;
