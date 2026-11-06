import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import TrimlyLogoLoader from "@/components/ui/TrimlyLogoLoader";

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
          const isSalonOwnerOrManager = Boolean(
            user.role === "salon" ||
            (user as any)?.is_manager ||
            (user as any)?.has_admin_rights
          );
          const isSubBarber = Boolean(
            !isSalonOwnerOrManager &&
            (user.parent_salon_id || (user as any)?.is_sub_barber)
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
      <TrimlyLogoLoader size="medium" />
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
