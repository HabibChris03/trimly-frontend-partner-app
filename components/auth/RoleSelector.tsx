import useColors from "@/hooks/usecolor";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type UserRole = "barber" | "salon" | "hairdresser";

interface RoleSelectorProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export default function RoleSelector({
  role,
  onRoleChange,
}: RoleSelectorProps) {
  const colors = useColors();

  const roles: { value: UserRole; label: string }[] = [
    { value: "barber", label: "Solo Barber" },
    { value: "hairdresser", label: "Hairdresser" },
    { value: "salon", label: "Salon / Shop" },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {roles.map(({ value, label }) => {
        const isActive = role === value;
        return (
          <TouchableOpacity
            key={value}
            activeOpacity={0.85}
            onPress={() => onRoleChange(value)}
            style={[
              styles.tab,
              isActive && {
                backgroundColor: colors.brand,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                isActive
                  ? [styles.activeTabText, { color: colors.onBrand }]
                  : [styles.inactiveTabText, { color: colors.secondaryText }],
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    width: "100%",
    height: 48,
    alignItems: "center",
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    height: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 12.5,
    letterSpacing: 0.1,
  },
  activeTabText: {
    fontWeight: "700",
  },
  inactiveTabText: {
    fontWeight: "600",
  },
});
