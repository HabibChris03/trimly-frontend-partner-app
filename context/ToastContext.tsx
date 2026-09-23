import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import useColors from "@/hooks/usecolor";
import { useTheme } from "@/context/ThemeContext";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions | string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  hideToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [toastData, setToastData] = useState<ToastOptions | null>(null);

  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastData(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback(
    (options: ToastOptions | string, type: ToastType = "success") => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const parsed: ToastOptions =
        typeof options === "string"
          ? { message: options, type }
          : { ...options, type: options.type || type };

      setToastData(parsed);

      translateY.setValue(-100);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 10,
          useNativeDriver: true,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = parsed.duration || 3200;
      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    },
    [hideToast, insets.top, opacity, translateY]
  );

  const getAccent = () => {
    switch (toastData?.type) {
      case "error":
        return {
          icon: "alert-circle-outline" as const,
          borderColor: isDark ? "#EF4444" : "#DC2626",
          iconColor: isDark ? "#EF4444" : "#DC2626",
          badgeBg: isDark ? "rgba(239, 68, 68, 0.18)" : "rgba(220, 38, 38, 0.12)",
        };
      case "warning":
        return {
          icon: "warning-outline" as const,
          borderColor: isDark ? "#F59E0B" : "#D97706",
          iconColor: isDark ? "#F59E0B" : "#D97706",
          badgeBg: isDark ? "rgba(245, 158, 11, 0.18)" : "rgba(217, 119, 6, 0.12)",
        };
      case "info":
        return {
          icon: "information-circle-outline" as const,
          borderColor: isDark ? "#60A5FA" : "#2563EB",
          iconColor: isDark ? "#60A5FA" : "#2563EB",
          badgeBg: isDark ? "rgba(96, 165, 250, 0.18)" : "rgba(37, 99, 235, 0.12)",
        };
      case "success":
      default:
        return {
          icon: "checkmark-circle-outline" as const,
          borderColor: isDark ? "#A3B39C" : "#4F6849",
          iconColor: isDark ? "#A3B39C" : "#4F6849",
          badgeBg: isDark ? "rgba(163, 179, 156, 0.18)" : "rgba(79, 104, 73, 0.12)",
        };
    }
  };

  const accent = getAccent();

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toastData && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY }],
              opacity,
              backgroundColor: colors.surface,
              borderColor: accent.borderColor,
              shadowColor: isDark ? "#000000" : "#2A3326",
              shadowOpacity: isDark ? 0.45 : 0.14,
            },
          ]}
        >
          <View style={[styles.iconBadge, { backgroundColor: accent.badgeBg }]}>
            <Ionicons name={accent.icon} size={20} color={accent.iconColor} />
          </View>
          <View style={styles.textContainer}>
            {toastData.title ? (
              <Text style={[styles.toastTitle, { color: colors.primarytext }]}>
                {toastData.title}
              </Text>
            ) : null}
            <Text
              style={[
                styles.toastMessage,
                { color: toastData.title ? colors.secondarytext : colors.primarytext },
              ]}
              numberOfLines={3}
            >
              {toastData.message}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={hideToast}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={16} color={colors.secondarytext} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    zIndex: 99999,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingRight: 6,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  toastMessage: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
