import { router } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";

const roleLevel: Record<UserRole, number> = {
  admin: 3,
  editor: 2,
  viewer: 1,
};

interface RoleRouteGateProps {
  children: React.ReactNode;
  minRole?: UserRole;
  exactRole?: UserRole;
}

export function RoleRouteGate({ children, minRole, exactRole }: RoleRouteGateProps) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/(auth)");
      return;
    }

    if (exactRole && user.role !== exactRole) {
      router.replace("/(tabs)");
      return;
    }

    if (minRole && roleLevel[user.role] < roleLevel[minRole]) {
      router.replace("/(tabs)");
    }
  }, [exactRole, loading, minRole, user]);

  if (loading || !user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (exactRole && user.role !== exactRole) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (minRole && roleLevel[user.role] < roleLevel[minRole]) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
