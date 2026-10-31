import React from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import useColors from "@/hooks/usecolor";
import { useLanguage } from "@/context/LanguageContext";

interface AnimatedTabBarProps {
  state: any;
  descriptors: any;
  navigation?: any;
  emitter?: any;
  navigateToTab?: (routeKey: string) => void;
  insets?: any;
  /** Reference design is icon-only; labels are still exposed to screen readers. */
  showLabels?: boolean;
}

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  emitter,
  navigateToTab,
}: AnimatedTabBarProps) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { tabBarTranslateY, isTabBarVisible, showTabBar } =
    useTabBarVisibility();

  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    if (!options) return false;
    if ((options as any).href === null) return false;
    if (!options.tabBarIcon) return false;
    return true;
  });

  const bottomInset = Math.max(12, insets.bottom);
  const currentRouteName = state.routes[state.index]?.name;

  const getTranslatedLabel = (routeName: string, fallback: any) => {
    const map: Record<string, string> = {
      index: "tabs.home",
      explore: "tabs.explore",
      booking: "tabs.bookings",
      bookings: "tabs.schedule",
      earnings: "tabs.earnings",
      profile: "tabs.profile",
    };
    const key = map[routeName.toLowerCase()];
    if (key) {
      const translated = t(key);
      if (translated && translated !== key) return translated;
    }
    return typeof fallback === "string" ? fallback : routeName;
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
      {visibleRoutes.map((route: any) => {
        const { options } = descriptors[route.key];
        const isFocused = currentRouteName === route.name;

        const onPress = () => {
          showTabBar();
          let isDefaultPrevented = false;

          if (navigation?.emit) {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            isDefaultPrevented = !!event?.defaultPrevented;
          } else if (emitter?.emit) {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            isDefaultPrevented = !!event?.defaultPrevented;
          }

          if (!isFocused && !isDefaultPrevented) {
            try {
              Haptics.selectionAsync().catch(() => {});
            } catch {}
            if (typeof navigateToTab === "function") {
              navigateToTab(route.key);
            } else if (navigation?.navigate) {
              navigation.navigate(route.name, route.params);
            } else {
              router.navigate(route.name as any);
            }
          }
        };

        const onLongPress = () => {
          if (navigation?.emit) {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          } else if (emitter?.emit) {
            emitter.emit({
              type: "tabLongPress",
              target: route.key,
            });
          }
        };

        const color = isFocused ? colors.brand : colors.secondaryText;

        const icon = options.tabBarIcon
          ? options.tabBarIcon({
              focused: isFocused,
              color,
              size: 24,
            })
          : null;

        const fallbackLabel =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const label = getTranslatedLabel(route.name, fallbackLabel);

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel || label}
            testID={options.tabBarButtonTestID || `tab-${route.name}`}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.75}
            style={styles.tabItem}
          >
            <View style={styles.iconBox}>{icon}</View>
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
