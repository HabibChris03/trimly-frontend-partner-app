import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useColorScheme, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  lightColors,
  darkColors,
  ColorTokens,
  ColorPalette,
} from "@/theme/colors";

export type ThemeMode = "light" | "dark" | "system";

export const DarkPalette: ColorTokens = darkColors;
export const LightPalette: ColorTokens = lightColors;

const THEME_STORAGE_KEY = "trimly_partner_urban_theme_v2";

async function getStoredTheme(): Promise<ThemeMode | null> {
  try {
    if (Platform.OS === "web") {
      return (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || null;
    }
    const val = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return (val as ThemeMode) || null;
  } catch {
    return null;
  }
}

async function persistTheme(mode: ThemeMode): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } else {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
    }
  } catch {}
}

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  colors: ColorTokens;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "dark",
  isDark: true,
  setThemeMode: () => {},
  toggleTheme: () => {},
  colors: darkColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    getStoredTheme().then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    persistTheme(mode);
  };

  const isDark =
    themeMode === "system" ? systemScheme !== "light" : themeMode === "dark";

  const toggleTheme = () => {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    setThemeMode(nextMode);
  };

  const colors = isDark ? darkColors : lightColors;

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
