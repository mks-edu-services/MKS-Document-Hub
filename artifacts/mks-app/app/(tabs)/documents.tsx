import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
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
import { DocumentCard } from "@/components/DocumentCard";
import { EmptyState } from "@/components/EmptyState";
import { RoleGate } from "@/components/RoleGate";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getDocuments } from "@/lib/firestore";
import { Document, DocumentStatus } from "@/types";

const SERVICE_TYPES = ["All", "Degree Certificate", "Notary", "Transcript", "Translation", "Other"];
const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Archived", value: "archived" },
];

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isFirebaseReady } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadDocs = useCallback(async () => {
    if (!isFirebaseReady) { setLoading(false); return; }
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, [isFirebaseReady]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const onRefresh = () => { setRefreshing(true); loadDocs(); };

  const filtered = documents.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.studentName.toLowerCase().includes(q) ||
      d.school.toLowerCase().includes(q) ||
      d.agent.toLowerCase().includes(q);
    const matchService = serviceFilter === "All" || d.serviceType === serviceFilter;
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchService && matchStatus;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.primary }]}>
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle}>Documents</Text>
          <RoleGate minRole="editor">
            <TouchableOpacity
              onPress={() => router.push("/document/new")}
              style={[styles.addBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={20} color="#fff" />
            </TouchableOpacity>
          </RoleGate>
        </View>

        <View style={[styles.searchBar, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search documents, students, schools..."
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

      <View style={[styles.filtersWrap, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {SERVICE_TYPES.map((svc) => (
            <TouchableOpacity
              key={svc}
              onPress={() => setServiceFilter(svc)}
              style={[
                styles.chip,
                {
                  backgroundColor: serviceFilter === svc ? colors.primary : colors.muted,
                  borderColor: serviceFilter === svc ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: serviceFilter === svc ? "#fff" : colors.foreground }]}>
                {svc}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
          {STATUS_FILTERS.map((s) => (
            <TouchableOpacity
              key={s.value}
              onPress={() => setStatusFilter(s.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: statusFilter === s.value ? colors.accent : colors.muted,
                  borderColor: statusFilter === s.value ? colors.accent : colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, { color: statusFilter === s.value ? "#fff" : colors.foreground }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DocumentCard
            document={item}
            onPress={() => router.push({ pathname: "/document/[id]", params: { id: item.id } })}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title={loading ? "Loading..." : "No documents found"}
            subtitle={
              loading
                ? ""
                : search || serviceFilter !== "All" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : isFirebaseReady
                ? "Create your first document to get started"
                : "Configure Firebase to store documents"
            }
            action={
              !loading && isFirebaseReady && !search && serviceFilter === "All" && statusFilter === "all"
                ? { label: "Create Document", onPress: () => router.push("/document/new") }
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
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  filtersWrap: { borderBottomWidth: 1 },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 6, flexDirection: "row", alignItems: "center" },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  chipDivider: { width: 1, height: 20, marginHorizontal: 4 },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
});
