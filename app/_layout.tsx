import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { applyGlobalFont, setMonoglyphicActive } from "@/constants/theme";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeProvider as AppThemeProvider, useTheme } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { LocationProvider } from "@/context/LocationContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useOTAUpdates } from "@/hooks/useOTAUpdates";

export const unstable_settings = {
  anchor: "index",
};

function RootNavigator() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  // Check and apply over-the-air updates via EAS Update
  useOTAUpdates();

  // Register push notifications on mobile devices and listen for incoming notifications
  usePushNotifications(user?.id);

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      text: "#121212",
      background: "#FAFBF8",
      card: "#FFFFFF",
      border: "#E5E9E2",
      primary: "#A3B39C",
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      text: "#FFFFFF",
      background: "#121212",
      card: "#1E1E1E",
      border: "#333333",
      primary: "#A3B39C",
    },
  };

  return (
    <NavThemeProvider value={isDark ? customDarkTheme : customLightTheme}>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/language-selection" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(barbers)" options={{ headerShown: false }} />
        <Stack.Screen name="(sub-barber)" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/booking-detail" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/barber-setup" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/help-support" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/notifications" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/gallery" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/portfolio-gallery" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/manage-services" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/manage-staff" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/salon-management" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </NavThemeProvider>
  );
}

import { TabBarVisibilityProvider } from "@/context/TabBarVisibilityContext";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      try {
        const Font = require("expo-font");
        if (Font.isLoaded("Monoglyphic-Regular") || Font.isLoaded("Monoglyphic")) {
          setMonoglyphicActive(true);
        }
      } catch {
        // Graceful fallback to Plus Jakarta Sans
      }
      applyGlobalFont();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#1C1E1B",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#A3B39C" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppThemeProvider>
          <LanguageProvider>
            <LocationProvider>
              <AuthProvider>
                <ToastProvider>
                  <NotificationProvider>
                    <TabBarVisibilityProvider>
                      <RootNavigator />
                    </TabBarVisibilityProvider>
                  </NotificationProvider>
                </ToastProvider>
              </AuthProvider>
            </LocationProvider>
          </LanguageProvider>
        </AppThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
