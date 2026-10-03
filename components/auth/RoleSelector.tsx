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
      style={[styles.container, { backgroundColor: colors.surfacevariant }]}
    >
      {roles.map(({ value, label }) => (
        <TouchableOpacity
          key={value}
          activeOpacity={0.8}
          onPress={() => onRoleChange(value)}
          style={[
            styles.tab,
            role === value && [
              styles.activeTab,
              {
                backgroundColor: colors.tabActiveBg,
              },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              role === value
                ? [styles.activeTabText, { color: colors.primarytext }]
                : [styles.inactiveTabText, { color: colors.secondarytext }],
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 28,
    padding: 4,
    width: "100%",
    height: 45,
    alignItems: "center",
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    height: "100%",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  activeTabText: {
    fontWeight: "700",
  },
  inactiveTabText: {
    fontWeight: "500",
  },
});
