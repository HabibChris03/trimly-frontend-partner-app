import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
  useSegments,
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
import { BarberSuspensionModal } from "@/components/barber/BarberSuspensionModal";
import { AccountActivationModal } from "@/components/barber/AccountActivationModal";
import FloatingBottomBar from "@/components/navigation/FloatingBottomBar";

export const unstable_settings = {
  anchor: "index",
};

function RootNavigator() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const segments = useSegments();
  
  // Check and apply over-the-air updates via EAS Update
  useOTAUpdates();

  // Register push notifications on mobile devices and listen for incoming notifications
  usePushNotifications(user?.id);

  const isExcludedPage = segments[1] === "language-selection" || segments[1] === "onboarding";
  const showPageBottomBar = segments[0] === "Pages" && !isExcludedPage && !!user;

  const customLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      text: "#171918",
      background: "#F5F5F2",
      card: "#FFFFFF",
      border: "#383D38",
      primary: "#C7F36B",
    },
  };

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      text: "#F5F5F2",
      background: "#171918",
      card: "#252926",
      border: "#383D38",
      primary: "#C7F36B",
    },
  };

  return (
    <NavThemeProvider value={isDark ? customDarkTheme : customLightTheme}>
      <Stack screenOptions={{ headerShown: false }}>
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
        <Stack.Screen name="Pages/portfolio" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/availability" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/manage-services" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/manage-staff" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/salon-management" options={{ headerShown: false }} />
        <Stack.Screen name="Pages/reviews" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <BarberSuspensionModal />
      <AccountActivationModal />
      {showPageBottomBar && <FloatingBottomBar />}
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
          backgroundColor: "#171918",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#C7F36B" />
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
