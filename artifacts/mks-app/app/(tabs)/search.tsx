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
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useServiceTypes } from "@/context/ServiceTypesContext";
import { useColors } from "@/hooks/useColors";
import { sortDocuments, type DocumentSortMode } from "@/lib/documentSorting";
import { getServiceTypeLabelFromValue, sortServiceTypes } from "@/lib/serviceTypes";
import { subscribeToDocuments } from "@/lib/firestore";
import { Document, FilterState } from "@/types";

const ACADEMIC_YEARS = ["All", "2024-2025", "2023-2024", "2022-2023", "2021-2022", "2020-2021"];
const STATUS_OPTIONS = ["All", "Active", "Draft", "Archived"];
const SORT_OPTIONS: Array<{ labelKey: "newestFirst" | "oldestFirst" | "nameAZ" | "nameZA" | "yearNewest" | "yearOldest" | "seatAscending"; value: DocumentSortMode }> = [
  { labelKey: "newestFirst", value: "updated-desc" },
  { labelKey: "oldestFirst", value: "updated-asc" },
  { labelKey: "nameAZ", value: "name-asc" },
  { labelKey: "nameZA", value: "name-desc" },
  { labelKey: "yearNewest", value: "year-desc" },
  { labelKey: "yearOldest", value: "year-asc" },
  { labelKey: "seatAscending", value: "seat-asc" },
];

function toDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeForRange(value: string, endOfDay = false) {
  const parsed = toDate(value);
  if (!parsed) return null;
  parsed.setHours(endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  return parsed;
}

function getDocumentDate(document: Document) {
  return document.date || document.updatedAt || document.createdAt;
}

function FilterSection({
  label,
  options,
  value,
  onChange,
  getOptionLabel,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  getOptionLabel?: (value: string) => string;
}) {
  const colors = useColors();
  return (
    <View style={fStyles.section}>
      <Text style={[fStyles.label, { color: colors.foreground }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={fStyles.chips}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[fStyles.chip, { backgroundColor: value === opt ? colors.primary : colors.muted, borderColor: value === opt ? colors.primary : colors.border }]}
            activeOpacity={0.8}
          >
            <Text style={[fStyles.chipText, { color: value === opt ? "#fff" : colors.foreground }]}>{getOptionLabel ? getOptionLabel(opt) : opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const fStyles = StyleSheet.create({
  section: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" },
  chips: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
});

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFirebaseReady } = useAuth();
  const { t, translateStatus, language } = useLanguage();
  const { serviceTypes, activeServiceTypes } = useServiceTypes();
  const { width } = useWindowDimensions();
  const isCompact = width < 640;
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<DocumentSortMode>("updated-desc");

  const [filters, setFilters] = useState<FilterState>({
    serviceType: "All",
    school: "",
    agent: "",
    academicYear: "All",
    status: "All",
    dateFrom: "",
    dateTo: "",
    searchQuery: "",
  });

  const serviceTypeOptions = useMemo(
    () => ["All", ...sortServiceTypes(activeServiceTypes.length > 0 ? activeServiceTypes : serviceTypes).map((serviceType) => serviceType.id)],
    [activeServiceTypes, serviceTypes],
  );
  const getServiceTypeLabel = (value: string) =>
    value === "All" ? t("all") : getServiceTypeLabelFromValue(language, value, serviceTypes);

  useEffect(() => {
    if (!isFirebaseReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToDocuments(
      (docs) => {
        setAllDocs(docs);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [isFirebaseReady]);

  const filtered = useMemo(() => {
    const q = filters.searchQuery.toLowerCase();
    return allDocs.filter((d) => {
      const matchQuery =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.studentName.toLowerCase().includes(q) ||
        d.school.toLowerCase().includes(q) ||
        d.agent.toLowerCase().includes(q) ||
        d.serviceType.toLowerCase().includes(q) ||
        d.templateName.toLowerCase().includes(q) ||
        d.scanSearchKey?.toLowerCase().includes(q) ||
        d.scanFileName?.toLowerCase().includes(q) ||
        (d.notes ?? "").toLowerCase().includes(q) ||
        Object.values(d.fields ?? {}).some((value) => value.toLowerCase().includes(q));
      const matchService = filters.serviceType === "All" || d.serviceType === filters.serviceType;
      const matchSchool = !filters.school || d.school.toLowerCase().includes(filters.school.toLowerCase());
      const matchAgent = !filters.agent || d.agent.toLowerCase().includes(filters.agent.toLowerCase());
      const matchYear = filters.academicYear === "All" || d.academicYear === filters.academicYear;
      const matchStatus = filters.status === "All" || d.status === filters.status.toLowerCase();
      const documentDate = getDocumentDate(d);
      const dateValue = normalizeForRange(documentDate);
      const fromValue = filters.dateFrom ? normalizeForRange(filters.dateFrom) : null;
      const toValue = filters.dateTo ? normalizeForRange(filters.dateTo, true) : null;
      const matchDate =
        (!fromValue || (dateValue ? dateValue >= fromValue : true)) &&
        (!toValue || (dateValue ? dateValue <= toValue : true));
      return matchQuery && matchService && matchSchool && matchAgent && matchYear && matchStatus && matchDate;
    });
  }, [allDocs, filters]);

  useEffect(() => {
    setResults(sortDocuments(filtered, sortMode));
  }, [filtered, sortMode]);

  const activeFilterCount = [
    filters.serviceType !== "All",
    filters.academicYear !== "All",
    filters.status !== "All",
    !!filters.school,
    !!filters.agent,
    !!filters.dateFrom,
    !!filters.dateTo,
    !!filters.searchQuery,
  ].filter(Boolean).length;

  const resetFilters = () =>
    setFilters({ serviceType: "All", school: "", agent: "", academicYear: "All", status: "All", dateFrom: "", dateTo: "", searchQuery: "" });

  const summary = useMemo(() => ({
    total: results.length,
    active: results.filter((d) => d.status === "active").length,
    draft: results.filter((d) => d.status === "draft").length,
    archived: results.filter((d) => d.status === "archived").length,
  }), [results]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>{t("advancedSearch")}</Text>
        <View style={[styles.searchRow, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder={t("searchByNameSchoolService")}
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={filters.searchQuery}
            onChangeText={(v) => setFilters((f) => ({ ...f, searchQuery: v }))}
          />
          {filters.searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setFilters((f) => ({ ...f, searchQuery: "" }))}>
              <Feather name="x" size={15} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
          <View style={styles.dividerV} />
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterBtn}>
            <Feather name="sliders" size={16} color={activeFilterCount > 0 ? "#00e5e5" : "rgba(255,255,255,0.7)"} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {showFilters && (
      <View style={[styles.filterPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>{t("filters")}</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={[styles.resetText, { color: colors.destructive }]}>{t("resetAll")}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.tipBox, { backgroundColor: colors.tealLight, borderColor: colors.border }]}>
            <Feather name="filter" size={16} color={colors.accent} />
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>{t("trackingTips")}</Text>
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                {t("trackingTipsDescription")}
              </Text>
            </View>
          </View>
          <FilterSection
            label={t("serviceTypeLabel")}
            options={serviceTypeOptions}
            value={filters.serviceType}
            onChange={(v) => setFilters((f) => ({ ...f, serviceType: v }))}
            getOptionLabel={getServiceTypeLabel}
          />
          <FilterSection
            label={t("academicYearLabel")}
            options={ACADEMIC_YEARS}
            value={filters.academicYear}
            onChange={(v) => setFilters((f) => ({ ...f, academicYear: v }))}
          />
          <FilterSection
            label={t("statusLabel")}
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <View style={fStyles.section}>
            <Text style={[fStyles.label, { color: colors.foreground }]}>{t("schoolLabel")}</Text>
            <View style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Feather name="book-open" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                placeholder={t("filterBySchoolName")}
                placeholderTextColor={colors.mutedForeground}
                value={filters.school}
                onChangeText={(v) => setFilters((f) => ({ ...f, school: v }))}
              />
            </View>
          </View>
          <View style={fStyles.section}>
            <Text style={[fStyles.label, { color: colors.foreground }]}>{t("agentLabel")}</Text>
            <View style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                placeholder={t("filterByAgentName")}
                placeholderTextColor={colors.mutedForeground}
                value={filters.agent}
                onChangeText={(v) => setFilters((f) => ({ ...f, agent: v }))}
              />
            </View>
          </View>
          <View style={[styles.rangeRow, isCompact && styles.rangeRowCompact]}>
            <View style={[styles.rangeCol, isCompact && styles.rangeColCompact, { flex: 1 }]}>
              <Text style={[fStyles.label, { color: colors.foreground }]}>{t("dateFrom")}</Text>
              <View style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  value={filters.dateFrom}
                  onChangeText={(v) => setFilters((f) => ({ ...f, dateFrom: v }))}
                />
              </View>
            </View>
            <View style={[styles.rangeCol, isCompact && styles.rangeColCompact, { flex: 1 }]}>
              <Text style={[fStyles.label, { color: colors.foreground }]}>{t("dateTo")}</Text>
              <View style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.fieldInput, { color: colors.foreground }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  value={filters.dateTo}
                  onChangeText={(v) => setFilters((f) => ({ ...f, dateTo: v }))}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      <View style={[styles.resultsBar, isCompact && styles.resultsBarCompact, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        <View style={[styles.resultsRow, isCompact && styles.resultsRowCompact]}>
          <Text style={[styles.resultsText, { color: colors.mutedForeground }]}>
            {loading ? t("searching") : `${summary.total} ${t("resultsFound")}`}
          </Text>
          <Text style={[styles.resultsHint, { color: colors.mutedForeground }]}>
            {activeFilterCount > 0 ? `${activeFilterCount} ${t("filtersActive")}` : t("liveTracking")}
          </Text>
        </View>
        {!loading && summary.total > 0 && (
          <View style={[styles.statsStrip, isCompact && styles.statsStripCompact]}>
            <View style={[styles.statPill, isCompact && styles.statPillCompact, { backgroundColor: colors.navyLight }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{summary.active}</Text>
              <Text style={[styles.statLabel, { color: colors.primary }]}>{translateStatus("active")}</Text>
            </View>
            <View style={[styles.statPill, isCompact && styles.statPillCompact, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{summary.draft}</Text>
              <Text style={[styles.statLabel, { color: colors.warning }]}>{translateStatus("draft")}</Text>
            </View>
            <View style={[styles.statPill, isCompact && styles.statPillCompact, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statValue, { color: colors.mutedForeground }]}>{summary.archived}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{translateStatus("archived")}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={[styles.sortBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.sortLabel, { color: colors.mutedForeground }]}>{t("sortBy")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => setSortMode(option.value)}
              style={[
                styles.sortChip,
                {
                  backgroundColor: sortMode === option.value ? colors.accent : colors.muted,
                  borderColor: sortMode === option.value ? colors.accent : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.sortChipText, { color: sortMode === option.value ? "#fff" : colors.foreground }]}>
                {t(option.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        style={styles.list}
        data={results}
        keyExtractor={(item) => item.id}
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
            icon="search"
            title={!isFirebaseReady ? t("firebaseNotConfigured") : t("noResultsFound")}
            subtitle={!isFirebaseReady ? t("setUpFirebaseToSearchDocuments") : t("tryDifferentSearchTerms")}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 12 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  dividerV: { width: 1, height: 20, backgroundColor: "rgba(255,255,255,0.2)" },
  filterBtn: { position: "relative", padding: 2 },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#ff4444",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  filterPanel: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  filterTitle: { fontSize: 15, fontWeight: "700" },
  resetText: { fontSize: 13, fontWeight: "600" },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  tipTextWrap: { flex: 1, gap: 3 },
  tipTitle: { fontSize: 13, fontWeight: "700" },
  tipText: { fontSize: 12.5, lineHeight: 18 },
  textField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
  },
  fieldInput: { flex: 1, fontSize: 13 },
  resultsBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resultsBarCompact: { paddingVertical: 8 },
  resultsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  resultsRowCompact: { flexDirection: "column", alignItems: "flex-start" },
  resultsText: { fontSize: 12, fontWeight: "600" },
  resultsHint: { fontSize: 11, fontWeight: "500" },
  statsStrip: { flexDirection: "row", gap: 8, marginTop: 8 },
  statsStripCompact: { flexWrap: "wrap" },
  sortBar: { borderBottomWidth: 1, paddingTop: 10, paddingBottom: 12 },
  sortLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 16 },
  sortScroll: { paddingHorizontal: 16, gap: 8, flexDirection: "row", alignItems: "center" },
  sortChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1 },
  sortChipText: { fontSize: 12, fontWeight: "600" },
  statPill: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: "center", gap: 2 },
  statPillCompact: { flexBasis: "48%" },
  statValue: { fontSize: 15, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  rangeRow: { flexDirection: "row", gap: 10 },
  rangeRowCompact: { flexDirection: "column" },
  rangeCol: { gap: 6 },
  rangeColCompact: { width: "100%" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
});
