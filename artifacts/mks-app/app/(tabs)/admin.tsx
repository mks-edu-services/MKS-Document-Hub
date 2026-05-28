import { Feather, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { deleteTemplate, getAllUsers, getTemplates, updateUserRole } from "@/lib/firestore";
import { AppUser, Template, UserRole } from "@/types";

const ROLES: UserRole[] = ["admin", "editor", "viewer"];
const roleColors: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: "#fee2e2", text: "#dc2626" },
  editor: { bg: "#dbeafe", text: "#1d4ed8" },
  viewer: { bg: "#f0fdf4", text: "#16a34a" },
};

type TabType = "templates" | "users";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isFirebaseReady } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [tab, setTab] = useState<TabType>("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!isFirebaseReady) { setLoading(false); return; }
    try {
      const [tmps, usrs] = await Promise.all([getTemplates(false), getAllUsers()]);
      setTemplates(tmps);
      setUsers(usrs);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, [isFirebaseReady]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  async function handleDeleteTemplate(id: string, name: string) {
    Alert.alert("Delete Template", `Delete "${name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTemplate(id);
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          } catch (_) {
            Alert.alert("Error", "Failed to delete template.");
          }
        },
      },
    ]);
  }

  async function handleChangeRole(uid: string, newRole: UserRole) {
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
    } catch (_) {
      Alert.alert("Error", "Failed to update role.");
    }
  }

  if (user?.role !== "admin") {
    return (
      <EmptyState
        icon="lock"
        title="Admin Access Only"
        subtitle="You don't have permission to access this area."
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.primary }]}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>

        <View style={[styles.tabRow, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
          {(["templates", "users"] as TabType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, tab === t && { backgroundColor: "rgba(255,255,255,0.2)" }]}
              activeOpacity={0.8}
            >
              {t === "templates" ? (
                <Feather name="layout" size={14} color={tab === t ? "#fff" : "rgba(255,255,255,0.6)"} />
              ) : (
                <Feather name="users" size={14} color={tab === t ? "#fff" : "rgba(255,255,255,0.6)"} />
              )}
              <Text style={[styles.tabText, { color: tab === t ? "#fff" : "rgba(255,255,255,0.6)" }]}>
                {t === "templates" ? "Templates" : "Users"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : tab === "templates" ? (
        <FlatList
          data={templates}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListHeaderComponent={
            <TouchableOpacity
              onPress={() => router.push("/template/new")}
              style={[styles.addTemplateBtnFull, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.addTemplateText}>Create New Template</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <EmptyState
              icon="layout"
              title="No templates yet"
              subtitle="Create a template to define document fields for different service types."
              action={{ label: "Create Template", onPress: () => router.push("/template/new") }}
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.templateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.templateCardTop}>
                <View style={[styles.templateIcon, { backgroundColor: colors.tealLight }]}>
                  <Feather name="layout" size={18} color={colors.accent} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.templateSub, { color: colors.mutedForeground }]}>
                    {item.serviceType} · {item.fields.length} field{item.fields.length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <View style={[styles.activeBadge, { backgroundColor: item.active ? colors.successLight : colors.muted }]}>
                  <Text style={[styles.activeBadgeText, { color: item.active ? colors.success : colors.mutedForeground }]}>
                    {item.active ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              {item.description ? (
                <Text style={[styles.templateDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
              ) : null}
              <View style={styles.templateActions}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/template/[id]", params: { id: item.id } })}
                  style={[styles.actionBtn, { backgroundColor: colors.navyLight }]}
                  activeOpacity={0.8}
                >
                  <Feather name="edit-2" size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteTemplate(item.id, item.name)}
                  style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uid}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <EmptyState icon="users" title="No users found" subtitle="Users will appear here once they sign up." />
          }
          renderItem={({ item }) => (
            <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.userAvatar, { backgroundColor: colors.navyLight }]}>
                <Text style={[styles.userInitial, { color: colors.primary }]}>
                  {item.displayName?.[0]?.toUpperCase() ?? item.email?.[0]?.toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: colors.foreground }]}>{item.displayName}</Text>
                <Text style={[styles.userEmail, { color: colors.mutedForeground }]}>{item.email}</Text>
              </View>
              {item.uid === user.uid ? (
                <View style={[styles.roleBadge, { backgroundColor: roleColors[item.role]?.bg ?? "#f0f4f8" }]}>
                  <Text style={[styles.roleText, { color: roleColors[item.role]?.text ?? "#6b7c93" }]}>
                    {item.role}
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.roleButtons}>
                    {ROLES.map((role) => (
                      <TouchableOpacity
                        key={role}
                        onPress={() => handleChangeRole(item.uid, role)}
                        style={[
                          styles.roleBtn,
                          {
                            backgroundColor: item.role === role ? roleColors[role].bg : colors.muted,
                            borderColor: item.role === role ? roleColors[role].text : colors.border,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.roleBtnText, { color: item.role === role ? roleColors[role].text : colors.mutedForeground }]}>
                          {role}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  tabRow: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 7,
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  addTemplateBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addTemplateText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  templateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  templateCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  templateIcon: { width: 40, height: 40, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: "700" },
  templateSub: { fontSize: 12, marginTop: 2 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeBadgeText: { fontSize: 11, fontWeight: "600" },
  templateDesc: { fontSize: 13, lineHeight: 18 },
  templateActions: { flexDirection: "row", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  userCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  userInitial: { fontSize: 18, fontWeight: "800" },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: "700" },
  userEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: "700" },
  roleButtons: { flexDirection: "row", gap: 6 },
  roleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roleBtnText: { fontSize: 12, fontWeight: "600" },
});

