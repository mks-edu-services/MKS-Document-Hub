import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts as useExpoFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalChrome } from "@/components/GlobalChrome";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Feather, MaterialIcons } from "@/components/AppIcons";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ServiceTypesProvider } from "@/context/ServiceTypesContext";
import { resolveApiBaseUrl } from "@/lib/apiBase";
import { setBaseUrl } from "@workspace/api-client-react";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, loading } = useAuth();

  useEffect(() => {
    setBaseUrl(resolveApiBaseUrl());
  }, []);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)");
      }
    }
  }, [user, loading]);

  if (loading) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="document/new"
        options={{
          headerShown: true,
          title: "New Document",
          presentation: "modal",
          headerStyle: { backgroundColor: "#003366" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="document/[id]"
        options={{
          headerShown: true,
          title: "Document Details",
          headerStyle: { backgroundColor: "#003366" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="template/new"
        options={{
          headerShown: true,
          title: "New Template",
          presentation: "modal",
          headerStyle: { backgroundColor: "#003366" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="template/[id]"
        options={{
          headerShown: true,
          title: "Edit Template",
          headerStyle: { backgroundColor: "#003366" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="user/[uid]"
        options={{
          headerShown: true,
          title: "User Account",
          headerStyle: { backgroundColor: "#003366" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useExpoFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...Feather.font,
    ...MaterialIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <LanguageProvider>
            <ServiceTypesProvider>
              <AuthProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <GlobalChrome />
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </AuthProvider>
            </ServiceTypesProvider>
          </LanguageProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
