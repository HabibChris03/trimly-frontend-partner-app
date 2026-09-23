import { useTheme } from "@/context/ThemeContext";
import { lightColors, ColorTokens } from "@/theme/colors";

export default function useColors(): ColorTokens {
  try {
    const theme = useTheme();
    if (theme && theme.colors) {
      return theme.colors;
    }
  } catch {
    // Fallback if outside provider
  }
  return lightColors;
}

export type { ColorTokens as ColorPalette };
