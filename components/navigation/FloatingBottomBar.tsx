import React from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useSegments } from "expo-router";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import useColors from "@/hooks/usecolor";
import { useAuth } from "@/context/AuthContext";

interface FloatingBottomBarProps {
  activeTab?: string;
  stagnant?: boolean;
}

export default function FloatingBottomBar({ activeTab, stagnant }: FloatingBottomBarProps) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { tabBarTranslateY, isTabBarVisible, showTabBar } = useTabBarVisibility();
  const { user } = useAuth();

  const isSalonOwnerOrManager = Boolean(
    user?.role === "salon" ||
    (user as any)?.is_manager ||
    (user as any)?.has_admin_rights
  );
  const isSubBarber = Boolean(
    !isSalonOwnerOrManager &&
    (user?.parent_salon_id || user?.is_sub_barber)
  );

  const isStagnant = Boolean(stagnant || isSubBarber);
  const bottomInset = Math.max(12, insets.bottom);

  // Sub-barber tabs
  const subBarberTabs: Array<{
    key: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconInactive: keyof typeof Ionicons.glyphMap;
    route: any;
  }> = [
    {
      key: "bookings",
      iconActive: "calendar",
      iconInactive: "calendar-outline",
      route: "/(sub-barber)/bookings",
    },
    {
      key: "services",
      iconActive: "cut",
      iconInactive: "cut-outline",
      route: "/(sub-barber)/services",
    },
    {
      key: "portfolio",
      iconActive: "images",
      iconInactive: "images-outline",
      route: "/(sub-barber)/portfolio",
    },
    {
      key: "profile",
      iconActive: "person",
      iconInactive: "person-outline",
      route: "/(sub-barber)/profile",
    },
  ];

  // Solo barber / salon owner tabs
  const soloBarberTabs: Array<{
    key: string;
    iconActive: keyof typeof Ionicons.glyphMap;
    iconInactive: keyof typeof Ionicons.glyphMap;
    route: any;
  }> = [
    {
      key: "home",
      iconActive: "home",
      iconInactive: "home-outline",
      route: "/(barbers)",
    },
    {
      key: "bookings",
      iconActive: "calendar",
      iconInactive: "calendar-outline",
      route: "/(barbers)/bookings",
    },
    {
      key: "earnings",
      iconActive: "stats-chart",
      iconInactive: "stats-chart-outline",
      route: "/(barbers)/earnings",
    },
    {
      key: "profile",
      iconActive: "person",
      iconInactive: "person-outline",
      route: "/(barbers)/profile",
    },
  ];

  const tabs = isSubBarber ? subBarberTabs : soloBarberTabs;

  // Determine current active tab
  const currentTab = activeTab || (() => {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment === "bookings") return "bookings";
    if (lastSegment === "services" || lastSegment === "manage-services") return isSubBarber ? "services" : undefined;
    if (lastSegment === "portfolio") return isSubBarber ? "portfolio" : undefined;
    if (lastSegment === "earnings") return "earnings";
    if (lastSegment === "profile" || lastSegment === "edit-profile") return "profile";
    if (!isSubBarber && segments[0] === "(barbers)" && (!lastSegment || (lastSegment as string) === "index")) return "home";
    return undefined;
  })();

  const handlePress = (targetRoute: any) => {
    if (!isStagnant) {
      showTabBar();
    }
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    router.replace(targetRoute);
  };

  return (
    <Animated.View
      pointerEvents={isStagnant ? "auto" : isTabBarVisible ? "auto" : "none"}
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          bottom: bottomInset,
          transform: isStagnant ? [] : [{ translateY: tabBarTranslateY }],
        },
      ]}
    >
      {tabs.map((tab) => {
        const isFocused = currentTab === tab.key;
        const color = isFocused ? colors.brand : colors.secondaryText;
        return (
          <TouchableOpacity
            key={tab.key}
            activeOpacity={0.75}
            onPress={() => handlePress(tab.route)}
            style={styles.tabItem}
          >
            <View style={styles.iconBox}>
              <Ionicons
                name={isFocused ? tab.iconActive : tab.iconInactive}
                size={23}
                color={color}
              />
            </View>
            <View
              style={[
                styles.activeDot,
                { backgroundColor: isFocused ? colors.brand : "transparent" },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    zIndex: 9999,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
});
