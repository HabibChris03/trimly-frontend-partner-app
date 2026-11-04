import { useTheme } from "@/context/ThemeContext";
import { darkColors, ColorTokens } from "@/theme/colors";

export default function useColors(): ColorTokens {
  const theme = useTheme();
  return theme?.colors || darkColors;
}

export type { ColorTokens as ColorPalette };
