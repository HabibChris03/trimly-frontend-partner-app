import { useTheme } from "@/context/ThemeContext";
import { AppImages } from "@/constants/images";

export function useThemeImages() {
  try {
    const { isDark } = useTheme();
    return isDark ? AppImages.dark : AppImages.light;
  } catch {
    return AppImages.dark;
  }
}
