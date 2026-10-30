/**
 * Trimly Partner — Dark Urban Design Tokens
 *
 * Single visual source of truth:
 * - Main background: #171918
 * - Elevated background: #252926
 * - Primary light surface: #FFFFFF
 * - Primary dark-mode text: #F5F5F2
 * - Secondary text: #A6ACA5
 * - Brand accent: #C7F36B
 * - Borders and dividers: #383D38
 */
export interface ColorTokens {
  background: string;
  card: string;
  secondarySurface: string;
  elevated: string;
  lightSurface: string;
  brand: string;
  brandDark: string;
  brandSoft: string;
  brandBorder: string;
  onBrand: string;
  accent: string;
  primaryText: string;
  secondaryText: string;
  mutedText: string;
  border: string;
  divider: string;
  overlay: string;
  white: string;
  star: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;

  // Compatibility tokens for existing screens
  surface: string;
  primarytext: string;
  secondarytext: string;
  surfacevariant: string;
  secondary: string;
  primary: string;
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  inputPlaceholder: string;
  tabActiveBg: string;
}

export const palette = {
  charcoal: "#171918",
  charcoalElevated: "#252926",
  charcoalHigh: "#2E332F",
  white: "#FFFFFF",
  offWhite: "#F5F5F2",
  grey: "#A6ACA5",
  greyMuted: "#6E756D",
  border: "#383D38",
  lime: "#C7F36B",
  limeDark: "#A9D94F",
  ink: "#171918",
} as const;

export const darkColors: ColorTokens = {
  background: palette.charcoal,
  card: palette.charcoalElevated,
  secondarySurface: palette.charcoalHigh,
  elevated: palette.charcoalElevated,
  lightSurface: palette.white,
  brand: palette.lime,
  brandDark: palette.limeDark,
  brandSoft: "rgba(199, 243, 107, 0.12)",
  brandBorder: "rgba(199, 243, 107, 0.35)",
  onBrand: palette.ink,
  accent: palette.lime,
  primaryText: palette.offWhite,
  secondaryText: palette.grey,
  mutedText: palette.greyMuted,
  border: palette.border,
  divider: "#383D38",
  overlay: "rgba(10, 11, 10, 0.74)",
  white: palette.white,
  star: palette.lime,
  success: "#22C55E",
  successSoft: "rgba(34, 197, 94, 0.14)",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.14)",
  error: "#EF4444",
  errorSoft: "rgba(239, 68, 68, 0.14)",
  info: "#3B82F6",
  infoSoft: "rgba(59, 130, 246, 0.14)",

  // Compatibility aliases
  surface: palette.charcoalElevated,
  primarytext: palette.offWhite,
  secondarytext: palette.grey,
  surfacevariant: palette.border,
  secondary: "rgba(199, 243, 107, 0.12)",
  primary: palette.lime,
  inputBg: palette.charcoalElevated,
  inputBorder: palette.border,
  inputBorderFocus: palette.lime,
  inputPlaceholder: palette.greyMuted,
  tabActiveBg: "rgba(199, 243, 107, 0.14)",
};

export const lightColors: ColorTokens = {
  background: "#F5F5F2",
  card: "#FFFFFF",
  secondarySurface: "#EAECE8",
  elevated: "#FFFFFF",
  lightSurface: "#FFFFFF",
  brand: "#C7F36B",
  brandDark: "#A9D94F",
  brandSoft: "rgba(199, 243, 107, 0.22)",
  brandBorder: "rgba(23, 25, 24, 0.2)",
  onBrand: "#171918",
  accent: "#171918",
  primaryText: "#171918",
  secondaryText: "#5C625B",
  mutedText: "#858B84",
  border: "#D8DDD6",
  divider: "#E2E6E0",
  overlay: "rgba(23, 25, 24, 0.6)",
  white: "#FFFFFF",
  star: "#171918",
  success: "#16A34A",
  successSoft: "rgba(22, 163, 74, 0.12)",
  warning: "#D97706",
  warningSoft: "rgba(217, 119, 6, 0.12)",
  error: "#DC2626",
  errorSoft: "rgba(220, 38, 38, 0.12)",
  info: "#2563EB",
  infoSoft: "rgba(37, 99, 235, 0.12)",

  // Compatibility aliases
  surface: "#FFFFFF",
  primarytext: "#171918",
  secondarytext: "#5C625B",
  surfacevariant: "#D8DDD6",
  secondary: "rgba(199, 243, 107, 0.24)",
  primary: "#C7F36B",
  inputBg: "#FFFFFF",
  inputBorder: "#D8DDD6",
  inputBorderFocus: "#171918",
  inputPlaceholder: "#858B84",
  tabActiveBg: "rgba(199, 243, 107, 0.28)",
};

export const BrandPhotos = {
  heroBarber:
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1000&q=80",
  shopCover:
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1000&q=80",
  authHero:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1000&q=80",
  gallery1:
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
  gallery2:
    "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=800&q=80",
  gallery3:
    "https://images.unsplash.com/photo-1534297635766-a262cdcb8ee4?auto=format&fit=crop&w=800&q=80",
  gallery4:
    "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80",
} as const;

export const DarkPalette = darkColors;
export const LightPalette = lightColors;

export type ColorPalette = ColorTokens;
