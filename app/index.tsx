import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";

import { getStoredActiveMode } from "@/services/api";

export default function Index() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  const { hasChosenLanguage, isLanguageLoading } = useLanguage();
  const colors = useColors();

  useEffect(() => {
    let isMounted = true;

    async function routeUser() {
      if (!isLoading && !isLanguageLoading) {
        if (!hasChosenLanguage) {
          // First-time user must select language first
          router.replace("/Pages/language-selection");
          return;
        }

        if (token && user) {
          if (!isMounted) return;
          const isSubBarber = Boolean(
            user.parent_salon_id ||
            (user as any)?.is_sub_barber ||
            (user as any)?.staff_title
          );

          if (user.role === "client" && !isSubBarber) {
            router.replace("/(auth)/login");
            return;
          }

          if (isSubBarber) {
            router.replace("/(sub-barber)/bookings" as any);
          } else {
            router.replace("/(barbers)");
          }
        } else {
          // Language selected, but logged out: redirect to login
          router.replace("/(auth)/login");
        }
      }
    }

    routeUser();

    return () => {
      isMounted = false;
    };
  }, [user, token, isLoading, hasChosenLanguage, isLanguageLoading, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color="#A3B39C" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
