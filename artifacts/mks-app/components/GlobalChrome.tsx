import { Feather } from "@/components/AppIcons";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LanguageToggle } from "@/components/LanguageToggle";

type MenuItem = {
  label: string;
  icon: string;
  href?: string;
  action?: () => void;
  visible?: boolean;
};

export function GlobalChrome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleDashboardPress() {
    setMenuOpen(false);
    router.replace({ pathname: "/(tabs)", params: { scrollTop: Date.now().toString() } } as never);
  }

  const items = useMemo<MenuItem[]>(
    () => [
      { label: t("dashboard"), icon: "home", href: "/(tabs)" },
      { label: t("documents"), icon: "file-text", href: "/(tabs)/documents" },
      { label: t("search"), icon: "search", href: "/(tabs)/search" },
      { label: t("profile"), icon: "user", href: "/(tabs)/profile" },
      { label: t("admin"), icon: "admin-panel-settings", href: "/(tabs)/admin", visible: user?.role === "admin" },
      { label: t("templates"), icon: "layout", href: "/template", visible: user?.role === "admin" },
      { label: t("newDocument"), icon: "file-plus", href: "/document/new", visible: user?.role !== "viewer" },
      { label: t("createTemplateAction"), icon: "layout", href: "/template/new", visible: user?.role === "admin" },
    ].filter((item) => item.visible !== false),
    [t, user?.role]
  );

  const initials = (user?.displayName ?? user?.email ?? "U").trim().charAt(0).toUpperCase();

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 8, left: 12, right: 12 }]}>
      <TouchableOpacity
        onPress={handleDashboardPress}
        activeOpacity={0.82}
        style={[styles.dashboardButton, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Feather name="home" size={16} color={colors.primary} />
        <Text style={[styles.dashboardText, { color: colors.primary }]}>{t("dashboard")}</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <LanguageToggle compact />
        <TouchableOpacity
          onPress={() => setMenuOpen((value) => !value)}
          activeOpacity={0.82}
          style={[styles.menuButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name={menuOpen ? "x" : "menu"} size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={menuOpen} animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.backdrop} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.foreground }]}>
            <View style={[styles.profileHeader, { borderBottomColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.navyLight }]}>
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.foreground }]} numberOfLines={1}>
                  {user?.displayName ?? t("profile")}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {user?.email ?? ""}
                </Text>
              </View>
            </View>

            <View style={styles.menuList}>
              {items.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => {
                    setMenuOpen(false);
                    if (item.action) {
                      item.action();
                      return;
                    }
                    if (item.href) {
                      router.push(item.href as never);
                    }
                  }}
                  style={[styles.menuItem, { borderBottomColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: colors.navyLight }]}>
                    <Feather name={item.icon as any} size={15} color={colors.accent} />
                  </View>
                  <Text style={[styles.menuText, { color: colors.foreground }]}>{item.label}</Text>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  void signOut();
                }}
                style={[styles.menuItem, styles.signOutItem, { borderBottomColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: "#fee2e2" }]}>
                  <Feather name="log-out" size={15} color={colors.destructive} />
                </View>
                <Text style={[styles.menuText, { color: colors.destructive }]}>{t("signOut")}</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 1000,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dashboardButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "55%",
  },
  dashboardText: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    alignItems: "flex-end",
    paddingTop: 72,
    paddingRight: 12,
  },
  dropdown: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 14,
    fontWeight: "800",
  },
  profileEmail: {
    fontSize: 12,
  },
  menuList: {
    paddingVertical: 6,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
});
