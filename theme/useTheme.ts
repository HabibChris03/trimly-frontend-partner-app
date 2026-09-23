import { useTheme as useBaseTheme } from "@/context/ThemeContext";
import { spacing } from "./spacing";
import { radius } from "./radius";
import { typography } from "./typography";
import { shadows } from "./shadows";
import { lightColors, darkColors, ColorTokens } from "./colors";

export function useTheme() {
  const context = useBaseTheme();
  const isDark = context.isDark;
  const colors: ColorTokens = isDark ? darkColors : lightColors;

  return {
    isDark,
    themeMode: context.themeMode,
    setThemeMode: context.setThemeMode,
    toggleTheme: context.toggleTheme,
    colors,
    spacing,
    radius,
    typography,
    shadows,
  };
}

export default useTheme;
