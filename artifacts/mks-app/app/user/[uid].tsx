import { Feather } from "@/components/AppIcons";
import { RoleRouteGate } from "@/components/RoleRouteGate";
import { PasswordField } from "@/components/PasswordField";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { generateTemporaryPassword, updateAdminUserPassword } from "@/lib/adminUsers";
import { createUser, getUser, updateUserProfile, updateUserRole } from "@/lib/firestore";
import { createFirebaseAuthUser } from "@/lib/firebaseAuth";
import { AppUser, AccountAccessStatus, UserRole } from "@/types";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ROLES: UserRole[] = ["admin", "editor", "viewer"];
const ACCESS_STATUSES: AccountAccessStatus[] = ["allowed", "pending", "denied"];

function avatarInitial(user: Partial<AppUser>) {
  return (user.displayName ?? user.username ?? user.email ?? "U").trim().charAt(0).toUpperCase();
}

export default function UserEditorScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user: currentUser, signOut } = useAuth();
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const isCreateMode = uid === "new";

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [record, setRecord] = useState<AppUser | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [role, setRole] = useState<UserRole>("viewer");
  const [accessStatus, setAccessStatus] = useState<AccountAccessStatus>("allowed");
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    let mounted = true;
    if (isCreateMode) {
      setPassword("");
      setTemporaryPassword("");
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      try {
        const existing = await getUser(uid);
        if (mounted) {
          setRecord(existing);
          setDisplayName(existing?.displayName ?? "");
          setUsername(existing?.username ?? "");
          setEmail(existing?.email ?? "");
          setPhoneNumber(existing?.phoneNumber ?? "");
          setRole(existing?.role ?? "viewer");
          setAccessStatus(existing?.accessStatus ?? "allowed");
          setPhotoURL(existing?.photoURL ?? "");
          setPassword("");
          setTemporaryPassword("");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isCreateMode, uid]);

  useEffect(() => {
    if (!record) return;
    setDisplayName(record.displayName ?? "");
    setUsername(record.username ?? "");
    setEmail(record.email ?? "");
    setPhoneNumber(record.phoneNumber ?? "");
    setRole(record.role ?? "viewer");
    setAccessStatus(record.accessStatus ?? "allowed");
    setPhotoURL(record.photoURL ?? "");
  }, [record]);

  const headerTitle = useMemo(() => (isCreateMode ? t("newUser") : t("editUser")), [isCreateMode, t]);
  const passwordLabel = isCreateMode ? t("password") : t("temporaryPassword");
  const passwordValue = isCreateMode ? password : temporaryPassword;
  const setPasswordValue = isCreateMode ? setPassword : setTemporaryPassword;

  function handleGeneratePassword() {
    setPasswordValue(generateTemporaryPassword());
  }

  async function handleSavePassword() {
    if (isCreateMode) return;
    if (!temporaryPassword.trim()) {
      Alert.alert(t("required"), t("temporaryPassword") + " " + t("fieldRequired"));
      return;
    }

    setPasswordSaving(true);
    try {
      await updateAdminUserPassword(uid, temporaryPassword.trim());
      Alert.alert(t("passwordReset"), t("passwordUpdated"));
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? t("failedToUpdatePassword"));
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handlePickPhoto() {
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
    const nextPhoto = asset.base64
      ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
      : asset.uri;
    setPhotoURL(nextPhoto);
  }

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert(t("required"), t("displayName") + " " + t("fieldRequired"));
      return;
    }
    if (!username.trim()) {
      Alert.alert(t("required"), t("username") + " " + t("fieldRequired"));
      return;
    }
    if (!email.trim()) {
      Alert.alert(t("required"), t("email") + " " + t("fieldRequired"));
      return;
    }
    if (isCreateMode && !password.trim()) {
      Alert.alert(t("required"), t("password") + " " + t("fieldRequired"));
      return;
    }

    setSaving(true);
    try {
      if (isCreateMode) {
        const created = await createFirebaseAuthUser(email.trim(), password.trim());
        await createUser({
          uid: created.localId,
          email: email.trim(),
          displayName: displayName.trim(),
          username: username.trim(),
          phoneNumber: phoneNumber.trim(),
          role,
          accessStatus,
          photoURL: photoURL || undefined,
          agentName: "",
        });
        Alert.alert(t("createUser"), t("accountCreated"));
        router.replace({ pathname: "/user/[uid]", params: { uid: created.localId } } as any);
        return;
      }

      await updateUserProfile(uid, {
        displayName: displayName.trim(),
        username: username.trim(),
        phoneNumber: phoneNumber.trim(),
        photoURL: photoURL || undefined,
        accessStatus,
      });
      if (role !== (record?.role ?? role)) {
        await updateUserRole(uid, role);
      }
      Alert.alert(t("editUser"), t("accountUpdated"));
      router.back();
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? t("failedToUpdateRole"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isCreateMode) return;
    Alert.alert(t("deleteUser"), `${t("deleteUser")} ? ${t("cannotBeUndone")}`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("deny"),
        style: "destructive",
        onPress: async () => {
          setSaving(true);
          try {
            await updateUserProfile(uid, { accessStatus: "denied" });
            if (currentUser?.uid === uid) {
              await signOut();
            }
            Alert.alert(t("deleteUser"), t("accountDenied"));
            router.back();
          } catch (error: any) {
            Alert.alert(t("error"), error?.message ?? t("failedToUpdateRole"));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (!currentUser) return null;

  return (
    <RoleRouteGate exactRole="admin">
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.primary }]}>{headerTitle}</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={handlePickPhoto} style={[styles.avatar, { backgroundColor: colors.navyLight }]}>
              {photoURL ? <Image source={{ uri: photoURL }} style={styles.avatarImage} /> : <Text style={[styles.avatarText, { color: colors.primary }]}>{avatarInitial({ displayName, username, email })}</Text>}
              {photoSaving ? <ActivityIndicator size="small" color="#fff" style={styles.avatarBadge} /> : <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}><Feather name="camera" size={12} color="#fff" /></View>}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>{t("tapAvatarToChangePhoto")}</Text>
            </View>
          </View>

          <Field label={t("displayName")} value={displayName} onChangeText={setDisplayName} colors={colors} />
          <Field label={t("username")} value={username} onChangeText={setUsername} colors={colors} />
          <Field label={t("email")} value={email} onChangeText={setEmail} colors={colors} editable={isCreateMode} />
          <Field label={t("phoneNumber")} value={phoneNumber} onChangeText={setPhoneNumber} colors={colors} />
          <PasswordField
            label={passwordLabel}
            value={passwordValue}
            onChangeText={setPasswordValue}
            placeholder={isCreateMode ? t("enterPassword") : t("temporaryPassword")}
            helperText={isCreateMode ? t("passwordHelp") : t("passwordResetHint")}
            actions={[
              {
                label: t("generatePassword"),
                onPress: handleGeneratePassword,
                variant: "secondary",
              },
            ]}
          />
          {!isCreateMode ? (
            <View style={[styles.passwordSection, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Text style={[styles.passwordSectionTitle, { color: colors.primary }]}>{t("passwordReset")}</Text>
              <Text style={[styles.passwordSectionHint, { color: colors.mutedForeground }]}>{t("passwordResetHint")}</Text>
              <TouchableOpacity
                onPress={handleSavePassword}
                style={[styles.passwordSaveBtn, { backgroundColor: colors.primary }]}
                disabled={passwordSaving || !temporaryPassword.trim()}
              >
                {passwordSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.passwordSaveText}>{t("savePassword")}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("role")}</Text>
          <View style={styles.pillsRow}>
            {ROLES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setRole(item)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: role === item ? colors.primary : colors.muted,
                    borderColor: role === item ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: role === item ? "#fff" : colors.foreground }]}>{t(item)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{t("accessStatus")}</Text>
          <View style={styles.pillsRow}>
            {ACCESS_STATUSES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setAccessStatus(item)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: accessStatus === item ? colors.accent : colors.muted,
                    borderColor: accessStatus === item ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={[styles.pillText, { color: accessStatus === item ? "#fff" : colors.foreground }]}>{t(item)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.secondaryBtn, { borderColor: colors.border }]} disabled={saving}>
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>{t("cancel")}</Text>
            </TouchableOpacity>
            {!isCreateMode ? (
              <TouchableOpacity onPress={handleDelete} style={[styles.deleteBtn, { borderColor: colors.destructive }]} disabled={saving}>
                <Text style={[styles.deleteText, { color: colors.destructive }]}>{t("deny")}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={handleSave} style={[styles.primaryBtn, { backgroundColor: colors.primary }]} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryText}>{isCreateMode ? t("createUser") : t("saveChanges")}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </RoleRouteGate>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  editable = true,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useColors>;
  editable?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        secureTextEntry={secureTextEntry}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.muted }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  avatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 84, height: 84, borderRadius: 42, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { fontSize: 30, fontWeight: "800" },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  helper: { fontSize: 12, lineHeight: 18 },
  fieldGroup: { gap: 6 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: "700" },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  secondaryText: { fontSize: 14, fontWeight: "700" },
  deleteBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  deleteText: { fontSize: 14, fontWeight: "700" },
  primaryBtn: { flex: 1.3, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  passwordSection: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  passwordSectionTitle: { fontSize: 15, fontWeight: "800" },
  passwordSectionHint: { fontSize: 12, lineHeight: 18 },
  passwordSaveBtn: { alignSelf: "flex-start", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11 },
  passwordSaveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
