import { Feather } from "@/components/AppIcons";
import { EmptyState } from "@/components/EmptyState";
import { RoleRouteGate } from "@/components/RoleRouteGate";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { deleteTemplate, getTemplates, updateTemplate } from "@/lib/firestore";
import { Template } from "@/types";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TemplateLibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, translateServiceType } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const tmps = await getTemplates(false);
      setTemplates(tmps);
    } catch (_) {
      Alert.alert(t("error"), "Template list ကိုမရသေးပါ။");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function onRefresh() {
    setRefreshing(true);
    void loadData();
  }

  async function handleToggleActive(template: Template) {
    try {
      await updateTemplate(template.id, { active: !template.active });
      setTemplates((prev) =>
        prev.map((item) => (item.id === template.id ? { ...item, active: !item.active } : item)),
      );
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? "Template ကို update မလုပ်နိုင်ပါ။");
    }
  }

  async function handleDelete(template: Template) {
    Alert.alert(
      t("deleteTemplate"),
      `"${template.name}" ${t("delete")} ?`,
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTemplate(template.id);
              setTemplates((prev) => prev.filter((item) => item.id !== template.id));
            } catch (_) {
              Alert.alert(t("error"), t("failedToDeleteTemplate"));
            }
          },
        },
      ],
    );
  }

  return (
    <RoleRouteGate exactRole="admin">
      <FlatList
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        data={templates}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.headerTitle}>Template Library</Text>
                <Text style={styles.headerSub}>Template structure ေတြကို စုစည်းပြီး manage လုပ်နိုင်ပါတယ်။</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/template/new")}
                style={[styles.createBtn, { backgroundColor: colors.accent }]}
                activeOpacity={0.85}
              >
                <Feather name="plus" size={18} color="#fff" />
                <Text style={styles.createBtnText}>{t("createTemplateAction")}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.templateStats}>
              <View style={[styles.statChip, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
                <Text style={styles.statValue}>{templates.length}</Text>
                <Text style={styles.statLabel}>{t("templates")}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
                <Text style={styles.statValue}>{templates.filter((item) => item.active).length}</Text>
                <Text style={styles.statLabel}>{t("active")}</Text>
              </View>
              <View style={[styles.statChip, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
                <Text style={styles.statValue}>{templates.filter((item) => !item.active).length}</Text>
                <Text style={styles.statLabel}>{t("inactive")}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <EmptyState
              icon="layout"
              title={t("noTemplatesAvailable")}
              subtitle={t("createFirstTemplate")}
              action={{ label: t("createTemplateAction"), onPress: () => router.push("/template/new") }}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, { backgroundColor: colors.tealLight }]}>
                <Feather name="layout" size={18} color={colors.accent} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {translateServiceType(item.serviceType)} · {item.fields.length} {t("fieldsCount")}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: item.active ? colors.successLight : colors.muted }]}>
                <Text style={[styles.badgeText, { color: item.active ? colors.success : colors.mutedForeground }]}>
                  {item.active ? t("active") : t("inactive")}
                </Text>
              </View>
            </View>

            {item.description ? (
              <Text style={[styles.description, { color: colors.mutedForeground }]}>{item.description}</Text>
            ) : null}

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/document/new", params: { templateId: item.id } })}
                style={[styles.actionBtn, { backgroundColor: colors.navyLight }]}
                activeOpacity={0.8}
              >
                <Feather name="file-plus" size={14} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>ဖောင်ထည့်ရန်</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/template/[id]", params: { id: item.id } })}
                style={[styles.actionBtn, { backgroundColor: colors.navyLight }]}
                activeOpacity={0.8}
              >
                <Feather name="edit-2" size={14} color={colors.primary} />
                <Text style={[styles.actionBtnText, { color: colors.primary }]}>{t("edit")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleToggleActive(item)}
                style={[styles.actionBtn, { backgroundColor: item.active ? "#fef3c7" : "#dcfce7" }]}
                activeOpacity={0.8}
              >
                <Feather name={item.active ? "eye-off" : "eye"} size={14} color={item.active ? "#b45309" : "#16a34a"} />
                <Text style={[styles.actionBtnText, { color: item.active ? "#b45309" : "#16a34a" }]}>
                  {item.active ? "Hide" : "Show"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleDelete(item)}
                style={[styles.actionBtn, { backgroundColor: "#fee2e2" }]}
                activeOpacity={0.8}
              >
                <Feather name="trash-2" size={14} color={colors.destructive} />
                <Text style={[styles.actionBtnText, { color: colors.destructive }]}>{t("delete")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </RoleRouteGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  headerCard: { borderRadius: 18, padding: 18, gap: 16 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4, lineHeight: 18 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  createBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  templateStats: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  statChip: { minWidth: 88, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: "center" },
  statValue: { color: "#fff", fontSize: 18, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "800" },
  meta: { fontSize: 12, marginTop: 3 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 11, fontWeight: "800" },
  description: { fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
});
