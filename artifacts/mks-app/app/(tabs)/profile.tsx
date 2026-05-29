import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { subscribeToDocuments } from "@/lib/firestore";
import { Document } from "@/types";

const ROLE_CONFIG = {
  admin: { label: "Admin", color: "#7c3aed", bg: "#ede9fe" },
  editor: { label: "Editor", color: "#0369a1", bg: "#e0f2fe" },
  viewer: { label: "Viewer", color: "#374151", bg: "#f3f4f6" },
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut, updateProfile, isFirebaseReady } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [editingName, setEditingName] = useState(false);
  const [editingAgent, setEditingAgent] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [agentName, setAgentName] = useState(user?.agentName ?? "");
  const [saving, setSaving] = useState(false);

  const [myDocs, setMyDocs] = useState<Document[]>([]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setAgentName(user?.agentName ?? "");
  }, [user]);

  useEffect(() => {
    if (!isFirebaseReady || !user) return;
    const unsub = subscribeToDocuments((docs) => {
      setMyDocs(docs.filter((d) => d.createdBy === user.uid));
    });
    return unsub;
  }, [isFirebaseReady, user?.uid]);

  async function handleSaveName() {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updateProfile({ displayName: displayName.trim() });
      setEditingName(false);
    } catch {
      Alert.alert("Error", "Failed to update name.");
    }
    setSaving(false);
  }

  async function handleSaveAgent() {
    setSaving(true);
    try {
      await updateProfile({ agentName: agentName.trim() });
      setEditingAgent(false);
    } catch {
      Alert.alert("Error", "Failed to update agent name.");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  const role = user?.role ?? "viewer";
  const roleConfig = ROLE_CONFIG[role];
  const initial = (user?.displayName ?? "U").charAt(0).toUpperCase();

  const totalDocs = myDocs.length;
  const activeDocs = myDocs.filter((d) => d.status === "active").length;
  const draftDocs = myDocs.filter((d) => d.status === "draft").length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.navyDark, colors.navyMid]}
        style={[styles.header, { paddingTop: topPad + 20 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={[styles.rolePill, { backgroundColor: roleConfig.bg }]}>
            <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
        </View>
        <Text style={styles.headerName}>{user?.displayName ?? "User"}</Text>
        <Text style={styles.headerEmail}>{user?.email ?? ""}</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        {[
          { label: "My Docs", value: totalDocs, color: colors.primary },
          { label: "Active", value: activeDocs, color: colors.success },
          { label: "Drafts", value: draftDocs, color: colors.warning },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>Profile Information</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="user" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Display Name</Text>
              {editingName ? (
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveName}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>{user?.displayName ?? "—"}</Text>
              )}
            </View>
          </View>
          {editingName ? (
            <View style={styles.editBtns}>
              <TouchableOpacity onPress={() => setEditingName(false)} disabled={saving}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveName} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.accent} /> : <Feather name="check" size={18} color={colors.accent} />}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingName(true)}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="briefcase" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Agent Name</Text>
              {editingAgent ? (
                <TextInput
                  value={agentName}
                  onChangeText={setAgentName}
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                  autoFocus
                  placeholder="Your agent / staff name"
                  placeholderTextColor={colors.mutedForeground}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveAgent}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>{user?.agentName || "—"}</Text>
              )}
            </View>
          </View>
          {editingAgent ? (
            <View style={styles.editBtns}>
              <TouchableOpacity onPress={() => setEditingAgent(false)} disabled={saving}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveAgent} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.accent} /> : <Feather name="check" size={18} color={colors.accent} />}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingAgent(true)}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="mail" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email</Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>{user?.email ?? "—"}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="shield" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Role</Text>
              <View style={[styles.rolePillInline, { backgroundColor: roleConfig.bg }]}>
                <Text style={[styles.rolePillText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>Account</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.memberSince, { color: colors.mutedForeground }]}>
          Member since{" "}
          {user?.createdAt
            ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
            : "—"}
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleSignOut}
        style={[styles.signOutBtn, { borderColor: colors.destructive }]}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 32, alignItems: "center", gap: 6 },
  avatarWrap: { alignItems: "center", gap: 10, marginBottom: 4 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: { fontSize: 12, fontWeight: "700" },
  headerName: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerEmail: { color: "rgba(255,255,255,0.65)", fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: -16,
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  cardTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  divider: { height: 1, marginVertical: 12 },
  separator: { height: 1, marginVertical: 4 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    gap: 10,
  },
  fieldLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  fieldValue: { fontSize: 15, fontWeight: "500" },
  fieldInput: {
    fontSize: 15,
    fontWeight: "500",
    borderBottomWidth: 1.5,
    paddingVertical: 2,
    minWidth: 160,
  },
  editBtns: { flexDirection: "row", gap: 12, alignItems: "center" },
  rolePillInline: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start", marginTop: 2 },
  rolePillText: { fontSize: 12, fontWeight: "700" },
  memberSince: { fontSize: 13 },
  signOutBtn: {
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: "700" },
});
