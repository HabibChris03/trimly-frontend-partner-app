export interface ColorTokens {
  background: string;
  card: string;
  secondarySurface: string;
  brand: string;
  brandDark: string;
  accent: string;
  primaryText: string;
  secondaryText: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  info: string;

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

export const lightColors: ColorTokens = {
  background: "#FAFBF8",
  card: "#FFFFFF",
  secondarySurface: "#F4F6F2",
  brand: "#A3B39C",
  brandDark: "#88977F",
  accent: "#5F7A61",
  primaryText: "#121212",
  secondaryText: "#6F756B",
  border: "#E5E9E2",
  success: "#2E8B57",
  warning: "#F59E0B",
  error: "#DC2626",
  info: "#3B82F6",

  // Compatibility aliases
  surface: "#FFFFFF",
  primarytext: "#121212",
  secondarytext: "#6F756B",
  surfacevariant: "#F4F6F2",
  secondary: "rgba(163, 179, 156, 0.15)",
  primary: "#5F7A61",
  inputBg: "#FFFFFF",
  inputBorder: "#E5E9E2",
  inputBorderFocus: "#5F7A61",
  inputPlaceholder: "#9CA3AF",
  tabActiveBg: "rgba(95, 122, 97, 0.12)",
};

export const darkColors: ColorTokens = {
  background: "#121212",
  card: "#1E1E1E",
  secondarySurface: "#2A2A2A",
  brand: "#A3B39C",
  brandDark: "#88977F",
  accent: "#A3B39C",
  primaryText: "#FFFFFF",
  secondaryText: "#B5B5B5",
  border: "#333333",
  success: "#2E8B57",
  warning: "#F59E0B",
  error: "#DC2626",
  info: "#3B82F6",

  // Compatibility aliases
  surface: "#1E1E1E",
  primarytext: "#FFFFFF",
  secondarytext: "#B5B5B5",
  surfacevariant: "#2A2A2A",
  secondary: "rgba(163, 179, 156, 0.2)",
  primary: "#A3B39C",
  inputBg: "#1E1E1E",
  inputBorder: "#333333",
  inputBorderFocus: "#A3B39C",
  inputPlaceholder: "#6B7280",
  tabActiveBg: "rgba(163, 179, 156, 0.18)",
};

export type ColorPalette = ColorTokens;
