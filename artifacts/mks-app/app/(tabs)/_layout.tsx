import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { Feather, MaterialIcons } from "@/components/AppIcons";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { useIsAdmin } from "@/components/RoleGate";

export default function TabLayout() {
  const colors = useColors();
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isAdmin = useIsAdmin();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          display: "none",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("dashboard"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size ?? 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="documents"
          options={{
            title: t("documents"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="file-text" size={size ?? 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: t("search"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="search" size={size ?? 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: t("admin"),
            href: isAdmin ? undefined : null,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="admin-panel-settings" size={size ?? 22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("profile"),
            tabBarIcon: ({ color, size }) => (
              <Feather name="user" size={size ?? 22} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
