import { Feather } from "@/components/AppIcons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/context/LanguageContext";
import { useServiceTypes } from "@/context/ServiceTypesContext";
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";
import { RoleGate } from "@/components/RoleGate";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { type DocumentSortMode } from "@/lib/documentSorting";
import { sortDocumentsForList } from "@/lib/documentListOrdering";
import { subscribeToDocuments, subscribeToTemplates } from "@/lib/firestore";
import { getRegistryFieldDefinitions } from "@/lib/registry";
import { getServiceTypeLabelFromValue, resolveServiceTypeId, sortServiceTypes } from "@/lib/serviceTypes";
import { getTemplateWorkbookColumns } from "@/lib/templateWorkbook";
import { Document, DocumentStatus, Template } from "@/types";
import { useWindowDimensions } from "react-native";
import * as XLSX from "xlsx";
const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];
const BASE_SORT_OPTIONS: Array<{ labelKey: "newestFirst" | "oldestFirst" | "nameAZ" | "nameZA" | "yearNewest" | "yearOldest" | "seatAscending"; value: DocumentSortMode }> = [
  { labelKey: "newestFirst", value: "updated-desc" },
  { labelKey: "oldestFirst", value: "updated-asc" },
  { labelKey: "nameAZ", value: "name-asc" },
  { labelKey: "nameZA", value: "name-desc" },
  { labelKey: "yearNewest", value: "year-desc" },
  { labelKey: "yearOldest", value: "year-asc" },
  { labelKey: "seatAscending", value: "seat-asc" },
];

const TEMPLATE_SORT_EXCLUDED_KEYS = new Set([
  "row_status",
  "template_id",
  "template_name",
  "app_document_id",
  "drive_link",
  "drive_file_id",
  "drive_file_name",
  "drive_folder_link",
  "drive_folder_path",
  "match_method",
  "match_confidence",
]);

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFirebaseReady } = useAuth();
  const { t, translateStatus, language } = useLanguage();
  const { serviceTypes, activeServiceTypes } = useServiceTypes();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const isCompact = width < 640;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortMode, setSortMode] = useState<DocumentSortMode>("updated-desc");
  const [templateSortKey, setTemplateSortKey] = useState("");

  useEffect(() => {
    if (!isFirebaseReady) { setLoading(false); return; }
    const unsub = subscribeToDocuments(
      (docs) => { setDocuments(docs); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, [isFirebaseReady]);

  useEffect(() => {
    if (!isFirebaseReady) {
      setTemplates([]);
      return;
    }
    const unsub = subscribeToTemplates(
      (items) => setTemplates(items),
      false,
      () => setTemplates([]),
    );
    return unsub;
  }, [isFirebaseReady]);

  const filtered = documents.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.studentName.toLowerCase().includes(q) ||
      d.school?.toLowerCase().includes(q) ||
      d.agent?.toLowerCase().includes(q) ||
      d.scanSearchKey?.toLowerCase().includes(q) ||
      d.scanFileName?.toLowerCase().includes(q) ||
      Object.values(d.fields ?? {}).some((value) => value.toLowerCase().includes(q));
    const matchService = serviceFilter === "All" || resolveServiceTypeId(d.serviceType, serviceTypes) === serviceFilter;
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchService && matchStatus;
  });
  const useTemplateSort = serviceFilter !== "All";
  const selectedTemplate = useMemo(() => {
    if (!useTemplateSort) return null;
    const matchingTemplates = templates.filter((template) => resolveServiceTypeId(template.serviceType, serviceTypes) === serviceFilter);
    if (matchingTemplates.length === 0) return null;
    return [...matchingTemplates].sort((left, right) => {
      if (left.active !== right.active) return left.active ? -1 : 1;
      return String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? ""));
    })[0];
  }, [serviceFilter, serviceTypes, templates, useTemplateSort]);
  const templateSortColumns = useMemo(() => {
    if (!selectedTemplate) return [];
    return getTemplateWorkbookColumns(selectedTemplate)
      .filter((column) => !TEMPLATE_SORT_EXCLUDED_KEYS.has(column.key))
      .map((column) => ({ key: column.key, label: column.label }));
  }, [selectedTemplate]);
  const effectiveSortMode: DocumentSortMode = sortMode === "template-order" ? "updated-desc" : sortMode;
  const activeTemplateSortKey = templateSortColumns.some((column) => column.key === templateSortKey)
    ? templateSortKey
    : templateSortColumns[0]?.key ?? "";
  useEffect(() => {
    if (!useTemplateSort) {
      if (templateSortKey) setTemplateSortKey("");
      return;
    }
    if (templateSortColumns.length === 0) return;
    if (!templateSortColumns.some((column) => column.key === templateSortKey)) {
      setTemplateSortKey(templateSortColumns[0].key);
    }
  }, [serviceFilter, templateSortColumns, templateSortKey, useTemplateSort]);
  const sorted = useMemo(
    () =>
      sortDocumentsForList(filtered, {
        query: search,
        serviceType: serviceFilter,
        sortMode: effectiveSortMode,
        templateSortKey: useTemplateSort ? activeTemplateSortKey : undefined,
        template: selectedTemplate ?? undefined,
        templates,
        serviceTypes,
      }),
    [activeTemplateSortKey, effectiveSortMode, filtered, search, selectedTemplate, serviceFilter, serviceTypes, templates, useTemplateSort],
  );
  const serviceTypeOptions = useMemo(
    () => ["All", ...sortServiceTypes(activeServiceTypes.length > 0 ? activeServiceTypes : serviceTypes).map((serviceType) => serviceType.id)],
    [activeServiceTypes, serviceTypes],
  );
  const getServiceTypeLabel = (value: string) =>
    value === "All" ? t("all") : getServiceTypeLabelFromValue(language, value, serviceTypes);
  const tracking = {
    total: sorted.length,
    active: sorted.filter((d) => d.status === "active").length,
    draft: sorted.filter((d) => d.status === "draft").length,
    archived: sorted.filter((d) => d.status === "archived").length,
    driveLinked: sorted.filter((d) => (d.driveSyncStatus ?? (d.driveFileUrl ? "synced" : "pending")) === "synced").length,
  };

  const hasActiveFilters = search.length > 0 || serviceFilter !== "All" || statusFilter !== "all" || effectiveSortMode !== "updated-desc";

  function resetFilters() {
    setSearch("");
    setServiceFilter("All");
    setStatusFilter("all");
    setSortMode("updated-desc");
    setTemplateSortKey("");
  }

  async function exportXlsx() {
    if (Platform.OS !== "web") return;

    const registryFieldLabels = new Map<string, string>(
      getRegistryFieldDefinitions().map((field) => [field.id, language === "en" ? field.labelEn : field.labelMy]),
    );
    const extraFieldKeys = Array.from(new Set(sorted.flatMap((doc) => Object.keys(doc.fields ?? {}))));
    const baseColumns = [
      { key: "index", label: t("serial") },
      { key: "seatPrefix", label: language === "en" ? "Seat Prefix" : "ခုံ" },
      { key: "certificateNo", label: language === "en" ? "Certificate No." : "အမှတ်" },
      { key: "year", label: t("academicYear") },
      { key: "name", label: t("studentName") },
      { key: "fatherName", label: language === "en" ? "Father Name" : "အဖအမည်" },
      { key: "township", label: language === "en" ? "Township" : "မြို့နယ်" },
      { key: "submittedBy", label: language === "en" ? "Submitted By" : "အပ်နှံသူ" },
      { key: "submittedDate", label: language === "en" ? "Submitted Date" : "အပ်နှံ ရက်စွဲ" },
      { key: "receivedDate", label: language === "en" ? "Received Date" : "ရရှိ ရက်စွဲ" },
      { key: "returnedDate", label: language === "en" ? "Returned Date" : "ပြန်ပို့ ရက်စွဲ" },
      { key: "issuedBy", label: language === "en" ? "Issued By" : "ထုတ်ပေးသူ" },
      { key: "notes", label: t("notes") },
      { key: "serviceType", label: t("serviceType") },
      { key: "school", label: t("schoolInstitution") },
      { key: "agent", label: t("agentProcessedBy") },
      { key: "title", label: t("documentTitle") },
      { key: "studentName", label: t("studentName") },
      { key: "academicYear", label: t("academicYear") },
      { key: "date", label: t("date") },
      { key: "status", label: t("statusLabel") },
      { key: "scanSearchKey", label: language === "en" ? "Scan Search Key" : "ရှာဖွေရန်သော့ချက်" },
      { key: "scanFileName", label: language === "en" ? "Scan File Name" : "ဖိုင်အမည်" },
    ];
    const extraColumns = extraFieldKeys
      .filter((key) => !baseColumns.some((column) => column.key === key))
      .map((key) => ({ key, label: registryFieldLabels.get(key) ?? key }));
    const columns = [...baseColumns, ...extraColumns];

    const sheetRows = sorted.map((doc, index) =>
      Object.fromEntries(
        columns.map((column) => {
          const docRecord = doc as unknown as Record<string, unknown>;
          const value =
            column.key === "index"
              ? index + 1
              : column.key === "serviceType"
              ? getServiceTypeLabelFromValue(language, doc.serviceType, serviceTypes)
              : column.key === "status"
              ? translateStatus(doc.status)
              : column.key in docRecord
              ? docRecord[column.key]
              : doc.fields?.[column.key];
          return [column.label, value ?? ""];
        }),
      ),
    );

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    worksheet["!cols"] = columns.map((column) => {
      const values = [column.label, ...sheetRows.map((row) => String(row[column.label] ?? ""))];
      const widest = values.reduce((max, value) => Math.max(max, value.length), 0);
      return { wch: Math.min(Math.max(widest + 2, 10), 40) };
    });
    if (worksheet["!ref"]) {
      worksheet["!autofilter"] = { ref: worksheet["!ref"] };
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Documents");
    const workbookData = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([workbookData], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mks-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.list}
        data={sorted}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.primary }]}>
              <View style={styles.titleRow}>
                <Text style={styles.headerTitle}>{t("documents")}</Text>
                <RoleGate minRole="editor">
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      onPress={() => void exportXlsx()}
                      style={[styles.reportBtn, { backgroundColor: colors.tealLight, borderColor: colors.border }]}
                      activeOpacity={0.85}
                    >
                      <Feather name="download" size={16} color={colors.accent} />
                      <Text style={[styles.reportBtnText, { color: colors.accent }]}>{t("report")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push("/drive-tools" as any)}
                      style={[styles.reportBtn, { backgroundColor: colors.navyLight, borderColor: colors.border }]}
                      activeOpacity={0.85}
                    >
                      <Feather name="file-text" size={16} color={colors.primary} />
                      <Text style={[styles.reportBtnText, { color: colors.primary }]}>{t("driveTools")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push("/document/new")}
                      style={[styles.addBtn, { backgroundColor: colors.accent }]}
                      activeOpacity={0.85}
                    >
                      <Feather name="plus" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </RoleGate>
              </View>

              <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("searchPlaceholder")}
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Feather name="x" size={15} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={[styles.panel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.panelHeader, isCompact && styles.panelHeaderCompact]}>
                <View>
                  <Text style={[styles.panelTitle, { color: colors.foreground }]}>{t("advancedSearch")}</Text>
                  <Text style={[styles.panelSubtitle, { color: colors.mutedForeground }]}>
                    {search || serviceFilter !== "All" || statusFilter !== "all"
                      ? `${sorted.length} ${t("resultsFound")}`
                      : t("trackingTipsDescription")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={resetFilters}
                  disabled={!hasActiveFilters}
                  style={[
                    styles.clearBtn,
                    {
                      backgroundColor: hasActiveFilters ? colors.navyLight : colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Feather name="rotate-ccw" size={14} color={hasActiveFilters ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.clearBtnText, { color: hasActiveFilters ? colors.primary : colors.mutedForeground }]}>
                    {t("resetAll")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.filterGrid, isWide && styles.filterGridWide]}>
                <View style={[styles.filterCard, isWide && styles.filterCardWide, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{t("serviceType")}</Text>
                  {isWide ? (
                    <View style={styles.filterWrap}>
                      {serviceTypeOptions.map((svc) => (
                        <TouchableOpacity
                          key={svc}
                          onPress={() => setServiceFilter(svc)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: serviceFilter === svc ? colors.primary : colors.card,
                              borderColor: serviceFilter === svc ? colors.primary : colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, { color: serviceFilter === svc ? "#fff" : colors.foreground }]}>
                            {getServiceTypeLabel(svc)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.filterScroll}>
                      {serviceTypeOptions.map((svc) => (
                        <TouchableOpacity
                          key={svc}
                          onPress={() => setServiceFilter(svc)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: serviceFilter === svc ? colors.primary : colors.card,
                              borderColor: serviceFilter === svc ? colors.primary : colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, { color: serviceFilter === svc ? "#fff" : colors.foreground }]}>
                            {getServiceTypeLabel(svc)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <View style={[styles.filterCard, isWide && styles.filterCardWide, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{t("statusLabel")}</Text>
                  {isWide ? (
                    <View style={styles.filterWrap}>
                      {STATUS_FILTERS.map((s) => (
                        <TouchableOpacity
                          key={s.value}
                          onPress={() => setStatusFilter(s.value)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: statusFilter === s.value ? colors.accent : colors.card,
                              borderColor: statusFilter === s.value ? colors.accent : colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, { color: statusFilter === s.value ? "#fff" : colors.foreground }]}>
                            {s.label === "All" ? t("all") : translateStatus(s.value as DocumentStatus)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.filterScroll}>
                      {STATUS_FILTERS.map((s) => (
                        <TouchableOpacity
                          key={s.value}
                          onPress={() => setStatusFilter(s.value)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: statusFilter === s.value ? colors.accent : colors.card,
                              borderColor: statusFilter === s.value ? colors.accent : colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.chipText, { color: statusFilter === s.value ? "#fff" : colors.foreground }]}>
                            {s.label === "All" ? t("all") : translateStatus(s.value as DocumentStatus)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <View style={[styles.filterCard, isWide && styles.filterCardWide, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{t("sortBy")}</Text>
                  {useTemplateSort ? (
                    <>
                      <View style={styles.filterWrap}>
                        {templateSortColumns.length > 0 ? (
                          templateSortColumns.map((option) => (
                            <TouchableOpacity
                              key={option.key}
                              onPress={() => setTemplateSortKey(option.key)}
                              style={[
                                styles.sortChip,
                                {
                                  backgroundColor: activeTemplateSortKey === option.key ? colors.accent : colors.card,
                                  borderColor: activeTemplateSortKey === option.key ? colors.accent : colors.border,
                                },
                              ]}
                              activeOpacity={0.8}
                            >
                              <Text
                                style={[
                                  styles.sortChipText,
                                  {
                                    color: activeTemplateSortKey === option.key ? "#fff" : colors.foreground,
                                  },
                                ]}
                              >
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <Text style={[styles.sortHelperText, { color: colors.mutedForeground }]}>Template မတွေ့သေးပါ</Text>
                        )}
                      </View>
                      <Text style={[styles.sortHelperText, { color: colors.mutedForeground }]}>
                        {selectedTemplate?.name ?? getServiceTypeLabel(serviceFilter)} — {t("serviceType")} အလိုက် Template ရဲ့ စာတိုင်ခေါင်းစဉ်တွေကို နှိပ်ပြီး စီပါ။
                      </Text>
                    </>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.filterScroll}>
                      {BASE_SORT_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => setSortMode(option.value)}
                          style={[
                            styles.sortChip,
                            {
                              backgroundColor: sortMode === option.value ? colors.accent : colors.card,
                              borderColor: sortMode === option.value ? colors.accent : colors.border,
                            },
                          ]}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.sortChipText,
                              {
                                color: sortMode === option.value ? "#fff" : colors.foreground,
                              },
                            ]}
                          >
                            {t(option.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.summaryStrip, isCompact && styles.summaryStripCompact, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
              <View style={[styles.summaryCard, isCompact && styles.summaryCardCompact, { backgroundColor: colors.navyLight }]}>
                <Feather name="file-text" size={14} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{tracking.total}</Text>
                <Text style={[styles.summaryLabel, { color: colors.primary }]}>{t("total")}</Text>
              </View>
              <View style={[styles.summaryCard, isCompact && styles.summaryCardCompact, { backgroundColor: colors.successLight }]}>
                <Feather name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.summaryValue, { color: colors.success }]}>{tracking.active}</Text>
                <Text style={[styles.summaryLabel, { color: colors.success }]}>{t("active")}</Text>
              </View>
              <View style={[styles.summaryCard, isCompact && styles.summaryCardCompact, { backgroundColor: colors.warningLight }]}>
                <Feather name="edit-3" size={14} color={colors.warning} />
                <Text style={[styles.summaryValue, { color: colors.warning }]}>{tracking.draft}</Text>
                <Text style={[styles.summaryLabel, { color: colors.warning }]}>{t("drafts")}</Text>
              </View>
              <View style={[styles.summaryCard, isCompact && styles.summaryCardCompact, { backgroundColor: colors.muted }]}>
                <Feather name="link" size={14} color={colors.mutedForeground} />
                <Text style={[styles.summaryValue, { color: colors.mutedForeground }]}>{tracking.driveLinked}</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{t("driveSync")}</Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item, index }) => (
          <DocumentCard
            document={item}
            serialNumber={index + 1}
            onPress={() => router.push({ pathname: "/document/[id]", params: { id: item.id } })}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title={loading ? t("loading") : t("noDocumentsFound")}
            subtitle={
              loading
                ? ""
                : search || serviceFilter !== "All" || statusFilter !== "all"
                ? t("tryAdjustFilters")
                : isFirebaseReady
                ? t("createYourFirstDocument")
                : t("configureFirebase")
            }
            action={
              !loading && isFirebaseReady && !search && serviceFilter === "All" && statusFilter === "all"
                ? { label: t("newDocument"), onPress: () => router.push("/document/new") }
                : undefined
            }
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  panelHeaderCompact: { flexDirection: "column", alignItems: "stretch" },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "flex-end" },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  reportBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 12, height: 40, borderRadius: 20, borderWidth: 1 },
  reportBtnText: { fontSize: 12, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  panel: { borderBottomWidth: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, gap: 6 },
  panelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  panelTitle: { fontSize: 16, fontWeight: "800" },
  panelSubtitle: { marginTop: 3, fontSize: 12, lineHeight: 17 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  clearBtnText: { fontSize: 12, fontWeight: "700" },
  filterGrid: { gap: 10 },
  filterGridWide: { flexDirection: "row" },
  filterCard: { borderWidth: 1, borderRadius: 14, padding: 6, gap: 5 },
  filterCardWide: { flex: 1, minWidth: 0 },
  filterLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  filterScroll: { gap: 8, flexDirection: "row", alignItems: "center", paddingVertical: 1, paddingRight: 8 },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  sortChip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  sortChipText: { fontSize: 11, fontWeight: "600" },
  sortHelperText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: "600" },
  summaryStrip: { flexDirection: "row", gap: 6, paddingHorizontal: 16, paddingVertical: 4, borderBottomWidth: 1 },
  summaryStripCompact: { flexWrap: "wrap" },
  summaryCard: { flex: 1, borderRadius: 12, paddingVertical: 5, alignItems: "center", gap: 0, minHeight: 50 },
  summaryCardCompact: { flexBasis: "48%" },
  summaryValue: { fontSize: 13, fontWeight: "800" },
  summaryLabel: { fontSize: 10, fontWeight: "700", textAlign: "center" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
});
