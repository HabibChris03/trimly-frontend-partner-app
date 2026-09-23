import React from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import useColors from "@/hooks/usecolor";

import { useLanguage } from "@/context/LanguageContext";

interface AnimatedTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: any;
  showLabels?: boolean;
}

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  showLabels = true,
}: AnimatedTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { tabBarTranslateY, isTabBarVisible, showTabBar } =
    useTabBarVisibility();

  // Filter out any hidden routes (only screens with a valid tabBarIcon and not hidden)
  const visibleRoutes = state.routes.filter((route: any) => {
    const { options } = descriptors[route.key];
    if (!options) return false;
    if ((options as any).href === null) return false;
    if (!options.tabBarIcon) return false;
    return true;
  });

  const bottomInset = Math.max(16, insets.bottom + 4);
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
          backgroundColor: colors.surface,
          borderColor: colors.surfacevariant,
          bottom: bottomInset,
          height: showLabels ? 66 : 58,
          transform: [{ translateY: tabBarTranslateY }],
        },
      ]}
    >
      {visibleRoutes.map((route: any) => {
        const { options } = descriptors[route.key];
        const isFocused = currentRouteName === route.name;

        const onPress = () => {
          showTabBar(); // Ensure navbar is visible when switching
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        const activeColor = colors.primary;
        const inactiveColor = colors.secondarytext;
        const color = isFocused ? activeColor : inactiveColor;

        const icon = options.tabBarIcon
          ? options.tabBarIcon({
              focused: isFocused,
              color,
              size: showLabels ? 22 : 23,
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
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.75}
            style={styles.tabItem}
          >
            <View
              style={[
                styles.iconBox,
                !showLabels && isFocused && {
                  backgroundColor: "rgba(163, 179, 156, 0.16)",
                },
              ]}
            >
              {icon}
            </View>
            {showLabels && typeof label === "string" && (
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color,
                    fontWeight: isFocused ? "700" : "500",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 12,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
  },
  iconBox: {
    width: 48,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
});
