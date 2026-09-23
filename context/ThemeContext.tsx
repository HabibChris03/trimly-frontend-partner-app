import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorScheme as useDeviceColorScheme } from "react-native";
import { lightColors, darkColors, ColorTokens, ColorPalette } from "@/theme/colors";

export type ThemeMode = "light" | "dark" | "system";

export const DarkPalette: ColorTokens = darkColors;
export const LightPalette: ColorTokens = lightColors;

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ColorTokens;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "light",
  isDark: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  // LIGHT MODE IS THE PRIMARY EXPERIENCE
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  const isDark =
    themeMode === "system"
      ? deviceScheme === "dark"
      : themeMode === "dark";

  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        setThemeMode,
        toggleTheme,
        colors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export type { ColorPalette, ColorTokens };
