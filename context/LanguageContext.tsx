import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";
import { en } from "@/locales/en";
import { fr } from "@/locales/fr";

export type SupportedLanguage = "en" | "fr";

const STORAGE_KEY_LANG = "trimly_app_language";
const STORAGE_KEY_CHOSEN = "trimly_has_chosen_language";

const dictionaries: Record<SupportedLanguage, any> = {
  en,
  fr,
};

async function getStorageItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch {
    // Handled
  }
}

interface LanguageContextType {
  language: SupportedLanguage;
  hasChosenLanguage: boolean;
  isLanguageLoading: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  completeLanguageSelection: (lang: SupportedLanguage) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  hasChosenLanguage: false,
  isLanguageLoading: true,
  setLanguage: async () => {},
  completeLanguageSelection: async () => {},
  t: (path: string) => path,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [hasChosenLanguage, setHasChosenLanguage] = useState<boolean>(false);
  const [isLanguageLoading, setIsLanguageLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        const [savedLang, hasChosen] = await Promise.all([
          getStorageItem(STORAGE_KEY_LANG),
          getStorageItem(STORAGE_KEY_CHOSEN),
        ]);

        if (savedLang === "en" || savedLang === "fr") {
          setLanguageState(savedLang);
        }
        if (hasChosen === "true") {
          setHasChosenLanguage(true);
        }
      } catch {
        // Fallback to default
      } finally {
        setIsLanguageLoading(false);
      }
    }
    loadSavedLanguage();
  }, []);

  const setLanguage = async (lang: SupportedLanguage) => {
    try {
      setLanguageState(lang);
      await setStorageItem(STORAGE_KEY_LANG, lang);
    } catch {
      // Handled
    }
  };

  const completeLanguageSelection = async (lang: SupportedLanguage) => {
    try {
      setLanguageState(lang);
      await Promise.all([
        setStorageItem(STORAGE_KEY_LANG, lang),
        setStorageItem(STORAGE_KEY_CHOSEN, "true"),
      ]);
      setHasChosenLanguage(true);
    } catch {
      // Handled
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split(".");
    let current: any = dictionaries[language];

    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        // Fallback to English
        let fallback: any = dictionaries.en;
        for (const fKey of keys) {
          if (fallback && typeof fallback === "object" && fKey in fallback) {
            fallback = fallback[fKey];
          } else {
            return path; // Return raw key if not found
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== "string") {
      return path;
    }

    if (params) {
      let result = current;
      for (const [paramKey, paramValue] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(paramValue));
      }
      return result;
    }

    return current;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        hasChosenLanguage,
        isLanguageLoading,
        setLanguage,
        completeLanguageSelection,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
