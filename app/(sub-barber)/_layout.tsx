import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, Redirect } from "expo-router";
import React from "react";
import AnimatedTabBar from "@/components/navigation/AnimatedTabBar";
import { useAuth } from "@/context/AuthContext";

export default function SubBarberTabLayout() {
  const colors = useColors();
  const { user } = useAuth();

  const isSubBarber = Boolean(
    user?.parent_salon_id ||
    user?.is_sub_barber ||
    (user as any)?.staff_title
  );

  // If user is a solo barber or salon owner, redirect to full barber dashboard
  if (user && !isSubBarber) {
    return <Redirect href="/(barbers)" />;
  }

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} showLabels={true} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="bookings"
        options={{
          title: "My Appointments",
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
        name="profile"
        options={{
          title: "My Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={22}
              name={focused ? "person" : "person-outline"}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
