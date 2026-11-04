import React from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useSegments } from "expo-router";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import useColors from "@/hooks/usecolor";

interface FloatingBottomBarProps {
  activeTab?: "home" | "bookings" | "earnings" | "profile";
}

export default function FloatingBottomBar({ activeTab }: FloatingBottomBarProps) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { tabBarTranslateY, isTabBarVisible, showTabBar } = useTabBarVisibility();

  const bottomInset = Math.max(12, insets.bottom);

  // Determine current active tab
  const currentTab = activeTab || (() => {
    const lastSegment = segments[segments.length - 1];
    if (lastSegment === "bookings") return "bookings";
    if (lastSegment === "earnings") return "earnings";
    if (lastSegment === "profile") return "profile";
    if (segments[0] === "(barbers)" && (!lastSegment || (lastSegment as string) === "index")) return "home";
    return undefined;
  })();

  const tabs: Array<{
    key: "home" | "bookings" | "earnings" | "profile";
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

  const handlePress = (targetRoute: any) => {
    showTabBar();
    try {
      Haptics.selectionAsync().catch(() => {});
    } catch {}
    router.replace(targetRoute);
  };

  return (
    <Animated.View
      pointerEvents={isTabBarVisible ? "auto" : "none"}
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          bottom: bottomInset,
          transform: [{ translateY: tabBarTranslateY }],
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
