import { Feather } from "@/components/AppIcons";
import { PasswordField } from "@/components/PasswordField";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
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
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { subscribeToDocuments } from "@/lib/firestore";
import { Document } from "@/types";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, signOut, updateProfile, deleteCurrentAccount, changePassword, isFirebaseReady } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [editingName, setEditingName] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingAgent, setEditingAgent] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
  const [agentName, setAgentName] = useState(user?.agentName ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const [myDocs, setMyDocs] = useState<Document[]>([]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setUsername(user?.username ?? "");
    setPhoneNumber(user?.phoneNumber ?? "");
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
      Alert.alert(t("error"), t("failedToUpdateName"));
    }
    setSaving(false);
  }

  async function handleSaveUsername() {
    setSaving(true);
    try {
      await updateProfile({ username: username.trim() });
      setEditingUsername(false);
    } catch {
      Alert.alert(t("error"), t("failedToUpdateName"));
    }
    setSaving(false);
  }

  async function handleSavePhone() {
    setSaving(true);
    try {
      await updateProfile({ phoneNumber: phoneNumber.trim() });
      setEditingPhone(false);
    } catch {
      Alert.alert(t("error"), t("failedToUpdateName"));
    }
    setSaving(false);
  }

  async function handleSaveAgent() {
    setSaving(true);
    try {
      await updateProfile({ agentName: agentName.trim() });
      setEditingAgent(false);
    } catch {
      Alert.alert(t("error"), t("failedToUpdateAgentName"));
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert(t("error"), t("fieldRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("error"), t("passwordMismatch"));
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      Alert.alert(t("changePassword"), t("passwordUpdated"));
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? t("failedToUpdatePassword"));
    } finally {
      setChangingPassword(false);
    }
  }

  async function handlePickPhoto() {
    if (!user) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t("error"), t("permissionRequired"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const photoURL = asset.base64
      ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
      : asset.uri;

    setSavingPhoto(true);
    try {
      await updateProfile({ photoURL });
    } catch {
      Alert.alert(t("error"), t("failedToUpdateProfilePhoto"));
    } finally {
      setSavingPhoto(false);
    }
  }

  async function handleSignOut() {
    Alert.alert(t("signOut"), t("signOutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("signOut"), style: "destructive", onPress: signOut },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(t("deleteUser"), `${t("deleteUser")} ? ${t("cannotBeUndone")}`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCurrentAccount();
          } catch {
            Alert.alert(t("error"), t("accountDeleted"));
          }
        },
      },
    ]);
  }

  const role = user?.role ?? "viewer";
  const roleConfig = {
    admin: { label: t("admin"), color: "#7c3aed", bg: "#ede9fe" },
    editor: { label: t("editor"), color: "#0369a1", bg: "#e0f2fe" },
    viewer: { label: t("viewer"), color: "#374151", bg: "#f3f4f6" },
  }[role];
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
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.85} style={styles.avatarTouch}>
            <View style={styles.avatar}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
              <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
                {savingPhoto ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="camera" size={12} color="#fff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <View style={[styles.rolePill, { backgroundColor: roleConfig.bg }]}>
            <Text style={[styles.roleText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
          </View>
        </View>
        <Text style={styles.headerName}>{user?.displayName ?? "User"}</Text>
        <Text style={styles.headerEmail}>{user?.email ?? ""}</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        {[
          { label: t("myDocs"), value: totalDocs, color: colors.primary },
          { label: t("active"), value: activeDocs, color: colors.success },
          { label: t("drafts"), value: draftDocs, color: colors.warning },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>{t("profileInformation")}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>{t("tapAvatarToChangePhoto")}</Text>

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="user" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t("displayName")}</Text>
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
            <Feather name="at-sign" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t("username")}</Text>
              {editingUsername ? (
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveUsername}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>{user?.username ?? "—"}</Text>
              )}
            </View>
          </View>
          {editingUsername ? (
            <View style={styles.editBtns}>
              <TouchableOpacity onPress={() => setEditingUsername(false)} disabled={saving}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveUsername} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.accent} /> : <Feather name="check" size={18} color={colors.accent} />}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingUsername(true)}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="phone" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t("phoneNumber")}</Text>
              {editingPhone ? (
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSavePhone}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>{user?.phoneNumber ?? "—"}</Text>
              )}
            </View>
          </View>
          {editingPhone ? (
            <View style={styles.editBtns}>
              <TouchableOpacity onPress={() => setEditingPhone(false)} disabled={saving}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSavePhone} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.accent} /> : <Feather name="check" size={18} color={colors.accent} />}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingPhone(true)}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="briefcase" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t("agentName")}</Text>
              {editingAgent ? (
                <TextInput
                  value={agentName}
                  onChangeText={setAgentName}
                  style={[styles.fieldInput, { color: colors.foreground, borderColor: colors.border }]}
                  autoFocus
                  placeholder={t("agentName")}
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
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t("email")}</Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>{user?.email ?? "—"}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        <View style={styles.fieldRow}>
          <View style={styles.fieldLeft}>
            <Feather name="shield" size={14} color={colors.accent} />
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t("role")}</Text>
              <View style={[styles.rolePillInline, { backgroundColor: roleConfig.bg }]}>
                <Text style={[styles.rolePillText, { color: roleConfig.color }]}>{roleConfig.label}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>{t("changePassword")}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>{t("passwordResetHint")}</Text>

        <PasswordField
          label={t("currentPassword")}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={t("currentPassword")}
        />
        <PasswordField
          label={t("newPassword")}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t("newPassword")}
        />
        <PasswordField
          label={t("confirmNewPassword")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder={t("confirmNewPassword")}
        />

        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={changingPassword}
          style={[styles.changePasswordBtn, { backgroundColor: colors.primary }]}
        >
          {changingPassword ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.changePasswordText}>{t("changePassword")}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>{t("account")}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.memberSince, { color: colors.mutedForeground }]}>
          {t("memberSince")}{" "}
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
        <Text style={[styles.signOutText, { color: colors.destructive }]}>{t("signOut")}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleDeleteAccount}
        style={[styles.deleteBtn, { borderColor: colors.destructive }]}
        activeOpacity={0.8}
      >
        <Feather name="trash-2" size={16} color={colors.destructive} />
        <Text style={[styles.signOutText, { color: colors.destructive }]}>{t("deleteUser")}</Text>
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
    overflow: "hidden",
  },
  avatarTouch: { borderRadius: 40 },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
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
  photoHint: { fontSize: 12, marginTop: 10, marginBottom: 2 },
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
  changePasswordBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  changePasswordText: { color: "#fff", fontSize: 14, fontWeight: "800" },
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
  deleteBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 30,
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
