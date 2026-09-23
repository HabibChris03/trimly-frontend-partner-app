export const typography = {
  fontFamily: {
    regular: "PlusJakartaSans_400Regular",
    medium: "PlusJakartaSans_500Medium",
    semiBold: "PlusJakartaSans_600SemiBold",
    bold: "PlusJakartaSans_700Bold",
    extraBold: "PlusJakartaSans_800ExtraBold",
  },
  sizes: {
    hero: { fontSize: 32, lineHeight: 40, fontWeight: "800" as const },
    h1: { fontSize: 26, lineHeight: 34, fontWeight: "700" as const },
    h2: { fontSize: 20, lineHeight: 28, fontWeight: "700" as const },
    h3: { fontSize: 17, lineHeight: 24, fontWeight: "600" as const },
    bodyLarge: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
    bodyMedium: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
    bodySmall: { fontSize: 12, lineHeight: 16, fontWeight: "400" as const },
    caption: { fontSize: 11, lineHeight: 14, fontWeight: "500" as const, letterSpacing: 0.3 },
    button: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const, letterSpacing: 0.2 },
  },
} as const;

export type Typography = typeof typography;
