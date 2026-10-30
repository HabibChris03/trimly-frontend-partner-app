import { useTheme as useBaseTheme } from "@/context/ThemeContext";
import { spacing } from "./spacing";
import { radius } from "./radius";
import { typography } from "./typography";
import { shadows } from "./shadows";
import { sizes } from "./sizes";
import { darkColors, ColorTokens } from "./colors";

export function useTheme() {
  const context = useBaseTheme();
  const colors: ColorTokens = context?.colors ?? darkColors;

  return {
    isDark: context ? context.isDark : true,
    themeMode: context ? context.themeMode : "dark",
    setThemeMode: context ? context.setThemeMode : () => {},
    toggleTheme: context ? context.toggleTheme : () => {},
    colors,
    spacing,
    radius,
    typography,
    shadows,
    sizes,
  };
}

export default useTheme;
