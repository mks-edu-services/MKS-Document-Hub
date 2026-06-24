import { Feather, MaterialIcons } from "@/components/AppIcons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState } from "@/components/EmptyState";
import { RoleRouteGate } from "@/components/RoleRouteGate";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useServiceTypes } from "@/context/ServiceTypesContext";
import { useColors } from "@/hooks/useColors";
import { deleteTemplate, deleteServiceType, getAllUsers, getTemplates, createServiceType, updateServiceType, updateUserRole, updateUserProfile } from "@/lib/firestore";
import { AppUser, ServiceType, Template, UserRole } from "@/types";
import { createServiceTypeId, getServiceTypeLabelFromValue } from "@/lib/serviceTypes";

const ROLES: UserRole[] = ["admin", "editor", "viewer"];
const roleColors: Record<UserRole, { bg: string; text: string }> = {
  admin: { bg: "#fee2e2", text: "#dc2626" },
  editor: { bg: "#dbeafe", text: "#1d4ed8" },
  viewer: { bg: "#f0fdf4", text: "#16a34a" },
};

type TabType = "templates" | "serviceTypes" | "users";

export default function AdminScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isFirebaseReady } = useAuth();
  const { t, language } = useLanguage();
  const { serviceTypes } = useServiceTypes();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const currentUser = user;
  const usersTableMinWidth = 860;

  const [tab, setTab] = useState<TabType>("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [editingServiceTypeId, setEditingServiceTypeId] = useState<string | null>(null);
  const [serviceTypeId, setServiceTypeId] = useState("");
  const [serviceTypeLabelMy, setServiceTypeLabelMy] = useState("");
  const [serviceTypeLabelEn, setServiceTypeLabelEn] = useState("");
  const [serviceTypeActive, setServiceTypeActive] = useState(true);
  const [serviceTypeSortOrder, setServiceTypeSortOrder] = useState("0");
  const [savingServiceType, setSavingServiceType] = useState(false);
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
    Alert.alert(t("deleteTemplate"), `${t("delete")} "${name}"? ${t("cannotBeUndone")}`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTemplate(id);
            setTemplates((prev) => prev.filter((t) => t.id !== id));
          } catch (_) {
            Alert.alert(t("error"), t("failedToDeleteTemplate"));
          }
        },
      },
    ]);
  }

  function resetServiceTypeForm() {
    setEditingServiceTypeId(null);
    setServiceTypeId("");
    setServiceTypeLabelMy("");
    setServiceTypeLabelEn("");
    setServiceTypeActive(true);
    setServiceTypeSortOrder("0");
  }

  function startEditServiceType(item: ServiceType) {
    setEditingServiceTypeId(item.id);
    setServiceTypeId(item.id);
    setServiceTypeLabelMy(item.labelMy ?? item.label ?? "");
    setServiceTypeLabelEn(item.labelEn ?? item.label ?? "");
    setServiceTypeActive(item.active);
    setServiceTypeSortOrder(String(item.sortOrder ?? 0));
    setTab("serviceTypes");
  }

  async function handleSaveServiceType() {
    const fallbackLabel = serviceTypeLabelMy.trim() || serviceTypeLabelEn.trim() || serviceTypeId.trim();
    if (!fallbackLabel) {
      Alert.alert(t("required"), t("serviceType") + " " + t("fieldRequired"));
      return;
    }

    const id = editingServiceTypeId ?? createServiceTypeId(serviceTypeLabelEn, serviceTypeLabelMy);
    const sortOrderValue = Number(serviceTypeSortOrder);
    const payload = {
      label: fallbackLabel,
      labelMy: serviceTypeLabelMy.trim() || undefined,
      labelEn: serviceTypeLabelEn.trim() || undefined,
      active: serviceTypeActive,
      sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : undefined,
      builtin: serviceTypes.find((item) => item.id === id)?.builtin ?? false,
    };

    setSavingServiceType(true);
    try {
      if (editingServiceTypeId) {
        await updateServiceType(editingServiceTypeId, payload);
      } else {
        await createServiceType({ id, ...payload });
      }
      resetServiceTypeForm();
      Alert.alert("အောင်မြင်", "ဝန်ဆောင်မှုအမျိုးအစားကို သိမ်းပြီးပါပြီ။");
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? "ဝန်ဆောင်မှုအမျိုးအစားကို save မလုပ်နိုင်ပါ။");
    } finally {
      setSavingServiceType(false);
    }
  }

  async function handleToggleServiceType(item: ServiceType) {
    try {
      await updateServiceType(item.id, { active: !item.active });
    } catch (_) {
      Alert.alert(t("error"), "ဝန်ဆောင်မှုအမျိုးအစားကို update မလုပ်နိုင်ပါ။");
    }
  }

  async function handleDeleteServiceType(item: ServiceType) {
    if (item.builtin) {
      Alert.alert(t("error"), "Builtin service type ကို delete မလုပ်ပါ။ Hide လုပ်ပါ။");
      return;
    }
    Alert.alert(t("delete"), `"${getServiceTypeLabelFromValue(language, item.id, serviceTypes)}" ${t("delete")} ?`, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteServiceType(item.id);
            if (editingServiceTypeId === item.id) {
              resetServiceTypeForm();
            }
          } catch (_) {
            Alert.alert(t("error"), "ဝန်ဆောင်မှုအမျိုးအစားကို delete မလုပ်နိုင်ပါ။");
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
      Alert.alert(t("error"), t("failedToUpdateRole"));
    }
  }

  async function handleChangeAccess(uid: string, accessStatus: "allowed" | "pending" | "denied") {
    try {
      await updateUserProfile(uid, { accessStatus });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, accessStatus } : u)));
      if (accessStatus === "denied" && uid === currentUser?.uid) {
        Alert.alert(t("accountDenied"), t("accessDeniedMessage"));
      }
    } catch (_) {
      Alert.alert(t("error"), t("failedToUpdateRole"));
    }
  }

  if (!currentUser) {
    return null;
  }

  return (
    <RoleRouteGate exactRole="admin">
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.primary }]}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>{t("adminPanel")}</Text>
        </View>

        <View style={[styles.tabRow, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
          {(["templates", "serviceTypes", "users"] as TabType[]).map((tabName) => (
            <TouchableOpacity
              key={tabName}
              onPress={() => setTab(tabName)}
              style={[styles.tabBtn, tab === tabName && { backgroundColor: "rgba(255,255,255,0.2)" }]}
              activeOpacity={0.8}
            >
              {tabName === "templates" ? (
                <Feather name="layout" size={14} color={tab === tabName ? "#fff" : "rgba(255,255,255,0.6)"} />
              ) : tabName === "serviceTypes" ? (
                <Feather name="tag" size={14} color={tab === tabName ? "#fff" : "rgba(255,255,255,0.6)"} />
              ) : (
                <Feather name="users" size={14} color={tab === tabName ? "#fff" : "rgba(255,255,255,0.6)"} />
              )}
              <Text style={[styles.tabText, { color: tab === tabName ? "#fff" : "rgba(255,255,255,0.6)" }]}>
                {tabName === "templates" ? t("templates") : tabName === "serviceTypes" ? t("serviceType") : t("users")}
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
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => router.push("/drive-tools" as any)}
                style={[styles.addTemplateBtnFull, { backgroundColor: colors.navyLight }]}
                activeOpacity={0.85}
              >
                <Feather name="file-text" size={18} color={colors.primary} />
                <Text style={[styles.addTemplateText, { color: colors.primary }]}>{t("driveTools")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/template/new")}
                style={[styles.addTemplateBtnFull, { backgroundColor: colors.accent }]}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.addTemplateText}>{t("createNewTemplate")}</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="layout"
              title={t("noTemplatesAvailable")}
              subtitle={t("createFirstTemplate")}
              action={{ label: t("createTemplateAction"), onPress: () => router.push("/template/new") }}
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
                    {getServiceTypeLabelFromValue(language, item.serviceType, serviceTypes)} · {item.fields.length} {t("fieldsCount")}
                  </Text>
                </View>
                <View style={[styles.activeBadge, { backgroundColor: item.active ? colors.successLight : colors.muted }]}>
                  <Text style={[styles.activeBadgeText, { color: item.active ? colors.success : colors.mutedForeground }]}>
                    {item.active ? t("active") : t("inactive")}
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
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t("edit")}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteTemplate(item.id, item.name)}
                  style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>{t("delete")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : tab === "serviceTypes" ? (
        <FlatList
          data={serviceTypes}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListHeaderComponent={
            <View style={styles.serviceTypeHeader}>
              <View style={[styles.headerActions, { gap: 8 }]}>
                <TouchableOpacity
                  onPress={resetServiceTypeForm}
                  style={[styles.addTemplateBtnFull, { backgroundColor: colors.navyLight }]}
                  activeOpacity={0.85}
                >
                  <Feather name="rotate-ccw" size={18} color={colors.primary} />
                  <Text style={[styles.addTemplateText, { color: colors.primary }]}>ဖောင်ရှင်းရန်</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveServiceType}
                  disabled={savingServiceType}
                  style={[styles.addTemplateBtnFull, { backgroundColor: colors.accent }]}
                  activeOpacity={0.85}
                >
                  {savingServiceType ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="save" size={18} color="#fff" />}
                  <Text style={styles.addTemplateText}>{editingServiceTypeId ? "ပြင်ဆင်သိမ်းရန်" : "အသစ်ထည့်ရန်"}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.templateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.templateName, { color: colors.foreground }]}>{editingServiceTypeId ? "ဝန်ဆောင်မှုအမျိုးအစား ပြင်ရန်" : "ဝန်ဆောင်မှုအမျိုးအစား အသစ်ထည့်ရန်"}</Text>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>ID</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                    value={serviceTypeId}
                    onChangeText={setServiceTypeId}
                    placeholder="service-type-id"
                    placeholderTextColor={colors.mutedForeground}
                    editable={!editingServiceTypeId}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>မြန်မာလို / Label MY</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                    value={serviceTypeLabelMy}
                    onChangeText={setServiceTypeLabelMy}
                    placeholder="အောင်လက်မှတ်"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>English / Label EN</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                    value={serviceTypeLabelEn}
                    onChangeText={setServiceTypeLabelEn}
                    placeholder="Degree Certificate"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.foreground }]}>အစီအစဉ်</Text>
                    <TextInput
                      style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
                      value={serviceTypeSortOrder}
                      onChangeText={setServiceTypeSortOrder}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => setServiceTypeActive((prev) => !prev)}
                    style={[styles.togglePill, { backgroundColor: serviceTypeActive ? colors.successLight : colors.muted, borderColor: colors.border }]}
                    activeOpacity={0.8}
                  >
                    <Feather name={serviceTypeActive ? "eye" : "eye-off"} size={16} color={serviceTypeActive ? colors.success : colors.mutedForeground} />
                    <Text style={[styles.togglePillText, { color: serviceTypeActive ? colors.success : colors.mutedForeground }]}>
                      {serviceTypeActive ? "ပြ" : "ဖျောက်"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="tag" title="ဝန်ဆောင်မှုအမျိုးအစားမရှိသေးပါ" subtitle="အပေါ်ကဖောင်မှတဆင့် အသစ်ထည့်နိုင်ပါတယ်။" />}
          renderItem={({ item }) => (
            <View style={[styles.templateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.templateCardTop}>
                <View style={[styles.templateIcon, { backgroundColor: colors.tealLight }]}>
                  <Feather name="tag" size={18} color={colors.accent} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateName, { color: colors.foreground }]}>
                    {getServiceTypeLabelFromValue(language, item.id, serviceTypes)}
                  </Text>
                  <Text style={[styles.templateSub, { color: colors.mutedForeground }]}>
                    {item.id} · {item.labelEn ?? item.labelMy ?? item.label}
                  </Text>
                </View>
                <View style={[styles.activeBadge, { backgroundColor: item.active ? colors.successLight : colors.muted }]}>
                  <Text style={[styles.activeBadgeText, { color: item.active ? colors.success : colors.mutedForeground }]}>
                    {item.active ? t("active") : t("inactive")}
                  </Text>
                </View>
              </View>
              <View style={styles.templateActions}>
                <TouchableOpacity
                  onPress={() => startEditServiceType(item)}
                  style={[styles.actionBtn, { backgroundColor: colors.navyLight }]}
                  activeOpacity={0.8}
                >
                  <Feather name="edit-2" size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t("edit")}</Text>
                </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleToggleServiceType(item)}
                    style={[styles.actionBtn, { backgroundColor: item.active ? "#fef3c7" : "#dcfce7" }]}
                    activeOpacity={0.8}
                  >
                  <Feather name={item.active ? "eye-off" : "eye"} size={14} color={item.active ? "#b45309" : "#16a34a"} />
                  <Text style={[styles.actionBtnText, { color: item.active ? "#b45309" : "#16a34a" }]}>
                    {item.active ? "ဖျောက်" : "ပြ"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleDeleteServiceType(item)}
                  style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]}
                  activeOpacity={0.8}
                >
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                  <Text style={[styles.actionBtnText, { color: colors.destructive }]}>{t("delete")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
          <View style={{ minWidth: usersTableMinWidth }}>
            <FlatList
              data={users}
              keyExtractor={(item) => item.uid}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
              ListHeaderComponent={
                <View style={styles.usersHeader}>
                  <TouchableOpacity
                    onPress={() => router.push({ pathname: "/user/[uid]", params: { uid: "new" } } as any)}
                    style={[styles.addTemplateBtnFull, { backgroundColor: colors.primary }]}
                    activeOpacity={0.85}
                  >
                    <Feather name="user-plus" size={18} color="#fff" />
                    <Text style={styles.addTemplateText}>{t("createUser")}</Text>
                  </TouchableOpacity>
                  <View style={[styles.tableHeader, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.tableHeaderCell, styles.accountCol, { color: colors.mutedForeground }]}>{t("account")}</Text>
                    <Text style={[styles.tableHeaderCell, styles.contactCol, { color: colors.mutedForeground }]}>{t("email")}</Text>
                    <Text style={[styles.tableHeaderCell, styles.statusCol, { color: colors.mutedForeground }]}>{t("accessStatus")}</Text>
                    <Text style={[styles.tableHeaderCell, styles.actionsCol, { color: colors.mutedForeground }]}>{t("edit")}/{t("allow")}</Text>
                  </View>
                </View>
              }
              ListEmptyComponent={
                <EmptyState icon="users" title={t("noUsersFound")} subtitle={t("usersWillAppear")} />
              }
              renderItem={({ item }) => (
                <View style={[styles.tableRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.accountCell, styles.accountCol]}>
                    <View style={[styles.userAvatar, { backgroundColor: colors.navyLight }]}>
                      {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} style={styles.userAvatarImage} />
                      ) : (
                        <Text style={[styles.userInitial, { color: colors.primary }]}>
                          {item.displayName?.[0]?.toUpperCase() ?? item.email?.[0]?.toUpperCase() ?? "?"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                        {item.displayName ?? item.username ?? t("newUser")}
                      </Text>
                      <Text style={[styles.userMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                        @{item.username ?? "-"}
                      </Text>
                      <Text style={[styles.userMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {item.uid === currentUser.uid ? t("currentUser") : item.role}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.contactCell, styles.contactCol]}>
                    <Text style={[styles.contactPrimary, { color: colors.foreground }]} numberOfLines={1}>
                      {item.email}
                    </Text>
                    <Text style={[styles.userMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {item.phoneNumber || "—"}
                    </Text>
                  </View>

                  <View style={[styles.statusCell, styles.statusCol]}>
                    <View style={[styles.roleBadge, { backgroundColor: roleColors[item.role]?.bg ?? "#f0f4f8" }]}>
                      <Text style={[styles.roleText, { color: roleColors[item.role]?.text ?? "#6b7c93" }]}>
                        {t(item.role)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.accessBadge,
                        {
                          backgroundColor:
                            (item.accessStatus ?? "allowed") === "allowed"
                              ? colors.successLight
                              : (item.accessStatus ?? "allowed") === "pending"
                              ? colors.warningLight
                              : "#fee2e2",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.accessText,
                          {
                            color:
                              (item.accessStatus ?? "allowed") === "allowed"
                                ? colors.success
                                : (item.accessStatus ?? "allowed") === "pending"
                                ? colors.warning
                                : colors.destructive,
                          },
                        ]}
                      >
                        {t(item.accessStatus ?? "allowed")}
                      </Text>
                    </View>
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
                            {t(role)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={[styles.actionsCell, styles.actionsCol]}>
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: "/user/[uid]", params: { uid: item.uid } } as any)}
                      style={[styles.userActionBtn, { backgroundColor: colors.navyLight }]}
                    >
                      <Feather name="edit-2" size={14} color={colors.primary} />
                      <Text style={[styles.userActionText, { color: colors.primary }]}>{t("edit")}</Text>
                    </TouchableOpacity>
                    {item.uid !== currentUser.uid ? (
                      <View style={styles.rowActions}>
                        <TouchableOpacity
                          onPress={() => handleChangeAccess(item.uid, "allowed")}
                          style={[styles.userActionBtn, { backgroundColor: colors.successLight }]}
                        >
                          <Feather name="check" size={14} color={colors.success} />
                          <Text style={[styles.userActionText, { color: colors.success }]}>{t("allow")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleChangeAccess(item.uid, "denied")}
                          style={[styles.userActionBtn, { backgroundColor: "#fee2e2" }]}
                        >
                          <Feather name="x-circle" size={14} color={colors.destructive} />
                          <Text style={[styles.userActionText, { color: colors.destructive }]}>{t("deny")}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </ScrollView>
      )}
    </View>
    </RoleRouteGate>
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
  usersHeader: { gap: 10, marginBottom: 16 },
  headerActions: { flexDirection: "column", gap: 10, marginBottom: 16 },
  addTemplateBtnFull: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 16,
  },
  addTemplateText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  serviceTypeHeader: { gap: 12, marginBottom: 16 },
  fieldGroup: { gap: 6 },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  label: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  togglePill: {
    minWidth: 104,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-end",
    marginTop: 23,
  },
  togglePillText: { fontSize: 13, fontWeight: "700" },
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
  tableHeader: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 10,
  },
  tableHeaderCell: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  tableRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  accountCol: { flex: 1.4, minWidth: 240 },
  contactCol: { flex: 1.2, minWidth: 200 },
  statusCol: { flex: 1.2, minWidth: 240 },
  actionsCol: { flex: 0.95, minWidth: 220 },
  accountCell: { flexDirection: "row", alignItems: "center", gap: 12 },
  contactCell: { justifyContent: "center", gap: 2 },
  statusCell: { justifyContent: "center", gap: 6 },
  actionsCell: { justifyContent: "center", gap: 6 },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  userAvatarImage: { width: "100%", height: "100%" },
  userInitial: { fontSize: 18, fontWeight: "800" },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 14, fontWeight: "700" },
  userMeta: { fontSize: 12 },
  contactPrimary: { fontSize: 13, fontWeight: "700" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: "700" },
  roleButtons: { flexDirection: "row", gap: 6, marginTop: 4 },
  roleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  roleBtnText: { fontSize: 12, fontWeight: "600" },
  userActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  userActionText: { fontSize: 12, fontWeight: "700" },
  accessBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  accessText: { fontSize: 11, fontWeight: "800" },
});
