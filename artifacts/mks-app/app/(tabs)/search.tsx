import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getDocuments } from "@/lib/firestore";
import { Document, FilterState } from "@/types";

const ACADEMIC_YEARS = ["All", "2024-2025", "2023-2024", "2022-2023", "2021-2022", "2020-2021"];
const SERVICE_TYPES = ["All", "Degree Certificate", "Notary", "Transcript", "Translation", "Other"];
const STATUS_OPTIONS = ["All", "Active", "Draft", "Archived"];

function FilterSection({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
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
            <Text style={[fStyles.chipText, { color: value === opt ? "#fff" : colors.foreground }]}>{opt}</Text>
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
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [results, setResults] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  const loadDocs = useCallback(async () => {
    if (!isFirebaseReady) return;
    setLoading(true);
    try {
      const docs = await getDocuments();
      setAllDocs(docs);
      setResults(docs);
    } catch (_) {}
    setLoading(false);
  }, [isFirebaseReady]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  useEffect(() => {
    const q = filters.searchQuery.toLowerCase();
    const filtered = allDocs.filter((d) => {
      const matchQuery =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.studentName.toLowerCase().includes(q) ||
        d.school.toLowerCase().includes(q) ||
        d.agent.toLowerCase().includes(q) ||
        d.serviceType.toLowerCase().includes(q);
      const matchService = filters.serviceType === "All" || d.serviceType === filters.serviceType;
      const matchSchool = !filters.school || d.school.toLowerCase().includes(filters.school.toLowerCase());
      const matchAgent = !filters.agent || d.agent.toLowerCase().includes(filters.agent.toLowerCase());
      const matchYear = filters.academicYear === "All" || d.academicYear === filters.academicYear;
      const matchStatus = filters.status === "All" || d.status === filters.status.toLowerCase();
      return matchQuery && matchService && matchSchool && matchAgent && matchYear && matchStatus;
    });
    setResults(filtered);
  }, [filters, allDocs]);

  const activeFilterCount = [
    filters.serviceType !== "All",
    filters.academicYear !== "All",
    filters.status !== "All",
    !!filters.school,
    !!filters.agent,
  ].filter(Boolean).length;

  const resetFilters = () =>
    setFilters({ serviceType: "All", school: "", agent: "", academicYear: "All", status: "All", dateFrom: "", dateTo: "", searchQuery: filters.searchQuery });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Advanced Search</Text>
        <View style={[styles.searchRow, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, school, service..."
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
            <Text style={[styles.filterTitle, { color: colors.foreground }]}>Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={[styles.resetText, { color: colors.destructive }]}>Reset all</Text>
            </TouchableOpacity>
          </View>
          <FilterSection
            label="Service Type"
            options={SERVICE_TYPES}
            value={filters.serviceType}
            onChange={(v) => setFilters((f) => ({ ...f, serviceType: v }))}
          />
          <FilterSection
            label="Academic Year"
            options={ACADEMIC_YEARS}
            value={filters.academicYear}
            onChange={(v) => setFilters((f) => ({ ...f, academicYear: v }))}
          />
          <FilterSection
            label="Status"
            options={STATUS_OPTIONS}
            value={filters.status}
            onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          />
          <View style={fStyles.section}>
            <Text style={[fStyles.label, { color: colors.foreground }]}>School</Text>
            <View style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Feather name="book-open" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                placeholder="Filter by school name"
                placeholderTextColor={colors.mutedForeground}
                value={filters.school}
                onChangeText={(v) => setFilters((f) => ({ ...f, school: v }))}
              />
            </View>
          </View>
          <View style={fStyles.section}>
            <Text style={[fStyles.label, { color: colors.foreground }]}>Agent</Text>
            <View style={[styles.textField, { borderColor: colors.border, backgroundColor: colors.muted }]}>
              <Feather name="user" size={14} color={colors.mutedForeground} />
              <TextInput
                style={[styles.fieldInput, { color: colors.foreground }]}
                placeholder="Filter by agent name"
                placeholderTextColor={colors.mutedForeground}
                value={filters.agent}
                onChangeText={(v) => setFilters((f) => ({ ...f, agent: v }))}
              />
            </View>
          </View>
        </View>
      )}

      <View style={[styles.resultsBar, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
        <Text style={[styles.resultsText, { color: colors.mutedForeground }]}>
          {loading ? "Searching..." : `${results.length} result${results.length !== 1 ? "s" : ""} found`}
        </Text>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => router.push({ pathname: "/document/[id]", params: { id: item.id } })}
          />
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListEmptyComponent={
          <EmptyState
            icon="search"
            title={!isFirebaseReady ? "Firebase not configured" : "No results found"}
            subtitle={!isFirebaseReady ? "Set up Firebase to search documents" : "Try different search terms or filters"}
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
    paddingTop: 14,
    paddingBottom: 4,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  filterTitle: { fontSize: 15, fontWeight: "700" },
  resetText: { fontSize: 13, fontWeight: "600" },
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
  resultsText: { fontSize: 12, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
});
