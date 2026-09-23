import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, Redirect } from "expo-router";
import React from "react";
import AnimatedTabBar from "@/components/navigation/AnimatedTabBar";
import { useAuth } from "@/context/AuthContext";

export default function BarberTabLayout() {
  const colors = useColors();
  const { user } = useAuth();

  const isSubBarber = Boolean(
    user?.parent_salon_id ||
    user?.is_sub_barber ||
    (user as any)?.staff_title
  );

  if (isSubBarber) {
    return <Redirect href="/(sub-barber)/bookings" />;
  }

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} showLabels={false} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={22}
              name={focused ? "grid" : "grid-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={22}
              name={focused ? "calendar" : "calendar-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: "Earnings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={22}
              name={focused ? "stats-chart" : "stats-chart-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={22}
              name={focused ? "person" : "person-outline"}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
