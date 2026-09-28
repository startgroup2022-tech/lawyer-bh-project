// Legal SOS mobile — design tokens
// Aligned with the Claude Design mobile bundle (mobile/styles.css).

export const colors = {
  bg: "#0B1426",
  bgElevated: "#142037",
  card: "#172541",
  cardBorder: "#22325A",
  divider: "#1E2C4D",

  // Gold (Au) — primary brand accent
  gold: "#D4A85A",
  gold2: "#E8C281",
  goldDim: "#9C7A3D",
  goldText: "#E8C281",

  // SOS red — used sparingly
  sos: "#D32F2F",
  sosLight: "#EF4444",
  sosDark: "#8A1E1E",
  sosTint: "rgba(211, 47, 47, 0.14)",

  // Semantic
  success: "#22C55E",
  warning: "#F59E0B",
  blue: "#60A5FA",
  violet: "#A78BFA",

  // Text
  white: "#FFFFFF",
  textMuted: "#8FA0BD",
  textSubtle: "#6B7B97",
  textDim: "#CDD5E3",

  // Map
  mapBg: "#0E1B33",
  mapRoad: "#1E3055",
  mapAccent: "#D4A85A",

  // Surface helpers
  whiteAlpha04: "rgba(255, 255, 255, 0.04)",
  whiteAlpha06: "rgba(255, 255, 255, 0.06)",
  whiteAlpha08: "rgba(255, 255, 255, 0.08)",
  whiteAlpha10: "rgba(255, 255, 255, 0.10)",
  goldTint12: "rgba(212, 168, 90, 0.12)",
  goldTint16: "rgba(212, 168, 90, 0.16)",
  goldBorder30: "rgba(212, 168, 90, 0.30)",
  goldBorder40: "rgba(212, 168, 90, 0.40)",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 26,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "500" as const, color: colors.white, letterSpacing: -0.7 },
  h2: { fontSize: 22, fontWeight: "500" as const, color: colors.white, letterSpacing: -0.4 },
  h3: { fontSize: 18, fontWeight: "500" as const, color: colors.white, letterSpacing: -0.2 },
  body: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
  small: { fontSize: 12, color: colors.textMuted },
  label: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: colors.gold2,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
  mono: {
    fontFamily: "ui-monospace",
    fontVariant: ["tabular-nums" as const],
  },
};

// Font families — Geist is the primary, IBM Plex Arabic for RTL.
// Inter is the fallback to keep things working without custom fonts.
export const fonts = {
  sans: "System",
  mono: "Menlo",
  serif: "Georgia",
  arabic: "System",
};
