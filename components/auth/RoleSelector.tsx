import useColors from "@/hooks/usecolor";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type UserRole = "barber" | "salon";

interface RoleSelectorProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export default function RoleSelector({
  role,
  onRoleChange,
}: RoleSelectorProps) {
  const colors = useColors();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surfacevariant }]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onRoleChange("barber")}
        style={[
          styles.tab,
          role === "barber" && [
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
            role === "barber"
              ? [styles.activeTabText, { color: colors.primarytext }]
              : [styles.inactiveTabText, { color: colors.secondarytext }],
          ]}
        >
          Solo Barber
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onRoleChange("salon")}
        style={[
          styles.tab,
          role === "salon" && [
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
            role === "salon"
              ? [styles.activeTabText, { color: colors.primarytext }]
              : [styles.inactiveTabText, { color: colors.secondarytext }],
          ]}
        >
          Salon / Shop
        </Text>
      </TouchableOpacity>
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
    fontSize: 15,
    letterSpacing: 0.2,
  },
  activeTabText: {
    fontWeight: "700",
  },
  inactiveTabText: {
    fontWeight: "500",
  },
});
