import React from "react";
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  onClear?: () => void;
  style?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search styles, barbers...",
  onFilterPress,
  onClear,
  style,
}: SearchBarProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: radius["2xl"],
          borderColor: colors.border,
          borderWidth: 1,
          paddingHorizontal: spacing.lg,
        },
        shadows.subtle,
        style,
      ]}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={colors.secondaryText}
        style={{ marginRight: spacing.sm }}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inputPlaceholder}
        style={[
          styles.input,
          {
            color: colors.primaryText,
            fontFamily: typography.fontFamily.medium,
          },
        ]}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            onChangeText("");
            onClear?.();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
        </TouchableOpacity>
      )}
      {onFilterPress && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onFilterPress}
          style={[
            styles.filterBtn,
            {
              backgroundColor: colors.secondarySurface,
              borderRadius: radius.md,
              marginLeft: spacing.sm,
            },
          ]}
        >
          <Ionicons name="options-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
  },
  filterBtn: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SearchBar;
