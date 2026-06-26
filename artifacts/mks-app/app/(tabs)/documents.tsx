import { Feather } from "@/components/AppIcons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Modal,
  Pressable,
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
import { resolveTemplateForServiceType } from "@/lib/templateResolution";
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

const TEMPLATE_SORT_LABELS: Record<string, { en: string; my: string }> = {
  title: { en: "Title", my: "ခေါင်းစဉ်" },
  service_type: { en: "Service Type", my: "ဝန်ဆောင်မှုအမျိုးအစား" },
  status: { en: "Status", my: "အခြေအနေ" },
  index: { en: "Index", my: "စဉ်" },
  seat_prefix: { en: "Seat Prefix", my: "ခုံ" },
  certificate_no: { en: "Certificate No.", my: "အမှတ်" },
  seat_no: { en: "Seat No", my: "ခုံနံပါတ်" },
  year: { en: "Year", my: "ခုနှစ်" },
  student_name: { en: "Student Name", my: "အမည်" },
  father_name: { en: "Father Name", my: "အဖအမည်" },
  township: { en: "Township", my: "မြို့နယ်" },
  submitted_by: { en: "Submitted By", my: "အပ်နှံသူ" },
  submitted_date: { en: "Submitted Date", my: "အပ်နှံ ရက်စွဲ" },
  received_date: { en: "Received Date", my: "ရရှိ ရက်စွဲ" },
  returned_date: { en: "Returned Date", my: "ပြန်ပို့ ရက်စွဲ" },
  issued_by: { en: "Issued By", my: "ထုတ်ပေးသူ" },
  school: { en: "School", my: "ကျောင်း" },
  academic_year: { en: "Academic Year", my: "ပညာသင်နှစ်" },
  agent: { en: "Agent", my: "Agent" },
  date: { en: "Date", my: "ရက်စွဲ" },
  notes: { en: "Notes", my: "မှတ်ချက်" },
};

const TEMPLATE_SORT_ALIAS_TO_KEY: Record<string, string> = {
  title: "title",
  ခေါင်းစဉ်: "title",
  servicetype: "service_type",
  service_type: "service_type",
  ဝန်ဆောင်မှုအမျိုးအစား: "service_type",
  status: "status",
  အခြေအနေ: "status",
  index: "index",
  စဉ်: "index",
  seatprefix: "seat_prefix",
  seat_prefix: "seat_prefix",
  ခုံ: "seat_prefix",
  certificateno: "certificate_no",
  certificate_no: "certificate_no",
  အမှတ်: "certificate_no",
  seatno: "seat_no",
  seat_no: "seat_no",
  ခုံနံပါတ်: "seat_no",
  year: "year",
  ခုနှစ်: "year",
  studentname: "student_name",
  student_name: "student_name",
  အမည်: "student_name",
  fathername: "father_name",
  father_name: "father_name",
  အဖအမည်: "father_name",
  township: "township",
  မြို့နယ်: "township",
  submittedby: "submitted_by",
  submitted_by: "submitted_by",
  အပ်နှံသူ: "submitted_by",
  submitteddate: "submitted_date",
  submitted_date: "submitted_date",
  အပ်နှံရက်စွဲ: "submitted_date",
  receiveddate: "received_date",
  received_date: "received_date",
  ရရှိရက်စွဲ: "received_date",
  returneddate: "returned_date",
  returned_date: "returned_date",
  ပြန်ပို့ရက်စွဲ: "returned_date",
  issuedby: "issued_by",
  issued_by: "issued_by",
  ထုတ်ပေးသူ: "issued_by",
  school: "school",
  ကျောင်း: "school",
  academicyear: "academic_year",
  academic_year: "academic_year",
  ပညာသင်နှစ်: "academic_year",
  agent: "agent",
  date: "date",
  ရက်စွဲ: "date",
  notes: "notes",
  မှတ်ချက်: "notes",
};

function getLocalizedTemplateSortLabel(
  columnKey: string,
  fallbackLabel: string,
  template: Template | null,
  language: string,
) {
  const isEnglish = language === "en";
  const baseLabel = TEMPLATE_SORT_LABELS[columnKey];
  if (baseLabel) {
    const normalizedFallback = fallbackLabel.trim();
    if (
      normalizedFallback &&
      normalizedFallback !== baseLabel.en &&
      normalizedFallback !== baseLabel.my
    ) {
      return normalizedFallback;
    }
    return isEnglish ? baseLabel.en : baseLabel.my;
  }

  if (columnKey.startsWith("custom_")) {
    const fieldId = columnKey.slice("custom_".length);
    const field = template?.fields.find((item) => item.id === fieldId);
    if (field) {
      return isEnglish
        ? field.label || field.labelEn || field.labelMy || field.id
        : field.label || field.labelMy || field.labelEn || field.id;
    }
  }

  return fallbackLabel;
}

function normalizeSortLabel(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function getTemplateSortCanonicalKey(columnKey: string, label: string) {
  const directKey = TEMPLATE_SORT_ALIAS_TO_KEY[columnKey] ?? TEMPLATE_SORT_ALIAS_TO_KEY[normalizeSortLabel(columnKey)];
  if (directKey) return directKey;
  const labelKey = TEMPLATE_SORT_ALIAS_TO_KEY[label] ?? TEMPLATE_SORT_ALIAS_TO_KEY[normalizeSortLabel(label)];
  if (labelKey) return labelKey;
  return columnKey.startsWith("custom_") ? `custom:${columnKey.slice("custom_".length)}` : columnKey;
}

function isAllServiceFilter(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "all" || normalized === "အားလုံး";
}

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
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const useTemplateSort = !isAllServiceFilter(serviceFilter);
  const selectedTemplate = useMemo(() => {
    if (!useTemplateSort) return null;
    return resolveTemplateForServiceType(serviceFilter, templates, serviceTypes);
  }, [serviceFilter, serviceTypes, templates, useTemplateSort]);
  const templateSortColumns = useMemo(() => {
    if (!selectedTemplate) return [];
    const seen = new Set<string>();
    return getTemplateWorkbookColumns(selectedTemplate)
      .filter((column) => !TEMPLATE_SORT_EXCLUDED_KEYS.has(column.key))
      .map((column) => {
        const label = getLocalizedTemplateSortLabel(column.key, column.label, selectedTemplate, language);
        const canonicalKey = getTemplateSortCanonicalKey(column.key, label);
        return { key: column.key, label, canonicalKey };
      })
      .filter((column) => {
        if (seen.has(column.canonicalKey)) return false;
        seen.add(column.canonicalKey);
        return true;
      });
  }, [language, selectedTemplate]);
  const effectiveSortMode: DocumentSortMode = sortMode === "template-order" ? "updated-desc" : sortMode;
  const activeTemplateSortKey = templateSortColumns.some((column) => column.key === templateSortKey)
    ? templateSortKey
    : templateSortColumns[0]?.key ?? "";
  const activeSortLabel = useMemo(() => {
    if (useTemplateSort) {
      return templateSortColumns.find((column) => column.key === activeTemplateSortKey)?.label ?? t("sortBy");
    }
    const activeBaseSort = BASE_SORT_OPTIONS.find((option) => option.value === sortMode) ?? BASE_SORT_OPTIONS[0];
    return t(activeBaseSort.labelKey);
  }, [activeTemplateSortKey, sortMode, t, templateSortColumns, useTemplateSort]);
  useEffect(() => {
    return () => {
      if (sortMenuOpenTimerRef.current) {
        clearTimeout(sortMenuOpenTimerRef.current);
      }
    };
  }, []);
  function openSortMenu() {
    if (!useTemplateSort) return;
    if (sortMenuOpenTimerRef.current) {
      clearTimeout(sortMenuOpenTimerRef.current);
    }
    sortMenuOpenTimerRef.current = setTimeout(() => {
      setSortMenuOpen(true);
      sortMenuOpenTimerRef.current = null;
    }, 40);
  }
  function toggleSortMenu() {
    if (!useTemplateSort) return;
    if (sortMenuOpen) {
      setSortMenuOpen(false);
      return;
    }
    openSortMenu();
  }
  useEffect(() => {
    if (!useTemplateSort) {
      if (templateSortKey) setTemplateSortKey("");
      if (sortMenuOpen) setSortMenuOpen(false);
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

  const hasActiveFilters = search.length > 0 || !isAllServiceFilter(serviceFilter) || statusFilter !== "all" || effectiveSortMode !== "updated-desc";

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
    const templateColumns = selectedTemplate ? getTemplateWorkbookColumns(selectedTemplate) : [];
    const resolveTemplateColumnLabel = (key: string, fallbackLabel: string) =>
      templateColumns.find((column) => column.key === key)?.label ?? fallbackLabel;
    const extraFieldKeys = Array.from(new Set(sorted.flatMap((doc) => Object.keys(doc.fields ?? {}))));
    const baseColumns = [
      { key: "index", label: t("serial") },
      { key: "seatPrefix", label: resolveTemplateColumnLabel("seat_prefix", language === "en" ? "Seat Prefix" : "ခုံ") },
      { key: "certificateNo", label: resolveTemplateColumnLabel("certificate_no", language === "en" ? "Certificate No." : "အမှတ်") },
      { key: "year", label: resolveTemplateColumnLabel("year", t("academicYear")) },
      { key: "name", label: t("studentName") },
      { key: "fatherName", label: resolveTemplateColumnLabel("father_name", language === "en" ? "Father Name" : "အဖအမည်") },
      { key: "township", label: resolveTemplateColumnLabel("township", language === "en" ? "Township" : "မြို့နယ်") },
      { key: "submittedBy", label: resolveTemplateColumnLabel("submitted_by", language === "en" ? "Submitted By" : "အပ်နှံသူ") },
      { key: "submittedDate", label: resolveTemplateColumnLabel("submitted_date", language === "en" ? "Submitted Date" : "အပ်နှံ ရက်စွဲ") },
      { key: "receivedDate", label: resolveTemplateColumnLabel("received_date", language === "en" ? "Received Date" : "ရရှိ ရက်စွဲ") },
      { key: "returnedDate", label: resolveTemplateColumnLabel("returned_date", language === "en" ? "Returned Date" : "ပြန်ပို့ ရက်စွဲ") },
      { key: "issuedBy", label: resolveTemplateColumnLabel("issued_by", language === "en" ? "Issued By" : "ထုတ်ပေးသူ") },
      { key: "notes", label: t("notes") },
      { key: "serviceType", label: resolveTemplateColumnLabel("service_type", t("serviceType")) },
      { key: "school", label: t("schoolInstitution") },
      { key: "agent", label: t("agentProcessedBy") },
      { key: "title", label: t("documentTitle") },
      { key: "studentName", label: resolveTemplateColumnLabel("student_name", t("studentName")) },
      { key: "academicYear", label: resolveTemplateColumnLabel("academic_year", t("academicYear")) },
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
                    {search || !isAllServiceFilter(serviceFilter) || statusFilter !== "all"
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
                    <View style={styles.sortDropdown}>
                      <TouchableOpacity
                        onPress={toggleSortMenu}
                        style={[
                          styles.sortDropdownButton,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                          },
                        ]}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.sortDropdownButtonText, { color: colors.foreground }]}>{activeSortLabel}</Text>
                          <Feather name={sortMenuOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <Modal
                        visible={sortMenuOpen}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setSortMenuOpen(false)}
                      >
                        <Pressable style={styles.sortDropdownOverlay} onPress={() => setSortMenuOpen(false)}>
                          <Pressable
                            style={[styles.sortDropdownMenu, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={(event) => event.stopPropagation()}
                          >
                            <Text style={[styles.sortDropdownMenuTitle, { color: colors.mutedForeground }]}>
                              {selectedTemplate?.name ?? getServiceTypeLabel(serviceFilter)}
                            </Text>
                            <ScrollView style={styles.sortDropdownScroll} nestedScrollEnabled>
                              {templateSortColumns.length > 0 ? (
                                templateSortColumns.map((option) => {
                                  const selected = activeTemplateSortKey === option.key;
                                  return (
                                    <TouchableOpacity
                                      key={option.key}
                                      onPress={() => {
                                        setTemplateSortKey(option.key);
                                        setSortMenuOpen(false);
                                      }}
                                      style={[
                                        styles.sortDropdownItem,
                                        {
                                          backgroundColor: selected ? colors.navyLight : colors.card,
                                          borderColor: selected ? colors.primary : colors.border,
                                        },
                                      ]}
                                      activeOpacity={0.8}
                                    >
                                      <Text style={[styles.sortDropdownItemText, { color: selected ? colors.primary : colors.foreground }]}>
                                        {option.label}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })
                              ) : (
                                <Text style={[styles.sortHelperText, { color: colors.mutedForeground }]}>Template မတွေ့သေးပါ</Text>
                              )}
                            </ScrollView>
                          </Pressable>
                        </Pressable>
                      </Modal>
                    </View>
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
                  {useTemplateSort && templateSortColumns.length > 0 && (
                    <Text style={[styles.sortHelperText, { color: colors.mutedForeground }]}>
                      {selectedTemplate?.name ?? getServiceTypeLabel(serviceFilter)} — {t("serviceType")} အလိုက် Template စာတိုင်ကို ရွေးပြီး Excel sort လိုမျိုး စီပါ။
                    </Text>
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
  sortDropdown: { gap: 8 },
  sortDropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.18)",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 180,
    paddingHorizontal: 16,
  },
  sortDropdownButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sortDropdownButtonText: { flex: 1, fontSize: 14, fontWeight: "600" },
  sortDropdownMenu: {
    width: "100%",
    maxWidth: 640,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 12,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  sortDropdownMenuTitle: { fontSize: 12, fontWeight: "700", marginBottom: 10 },
  sortDropdownScroll: { maxHeight: 320 },
  sortDropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  sortDropdownItemText: { fontSize: 13, fontWeight: "600" },
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
