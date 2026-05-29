import { Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DocumentCard } from "@/components/DocumentCard";
import { MKSLogo } from "@/components/MKSLogo";
import { RoleGate } from "@/components/RoleGate";
import { SetupBanner } from "@/components/SetupBanner";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { subscribeToDocuments, subscribeToTemplates } from "@/lib/firestore";
import { Document, Template } from "@/types";

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}

const SERVICE_TYPES = ["Degree Certificate", "Notary", "Transcript", "Translation", "Other"];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isFirebaseReady } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  useEffect(() => {
    if (!isFirebaseReady) { setLoading(false); return; }
    let loaded = { docs: false, tmps: false };
    const check = () => { if (loaded.docs && loaded.tmps) setLoading(false); };

    const unsubDocs = subscribeToDocuments((docs) => {
      setDocuments(docs);
      loaded.docs = true;
      check();
    });
    const unsubTmps = subscribeToTemplates((tmps) => {
      setTemplates(tmps);
      loaded.tmps = true;
      check();
    });

    return () => { unsubDocs(); unsubTmps(); };
  }, [isFirebaseReady]);

  const recentDocs = documents.slice(0, 5);
  const totalDocs = documents.length;
  const activeDocs = documents.filter(d => d.status === "active").length;
  const draftDocs = documents.filter(d => d.status === "draft").length;

  const statCards: StatCard[] = [
    { label: "Total", value: totalDocs, icon: "insert-drive-file", color: colors.primary, bg: colors.navyLight },
    { label: "Active", value: activeDocs, icon: "check-circle", color: colors.success, bg: colors.successLight },
    { label: "Drafts", value: draftDocs, icon: "edit", color: colors.warning, bg: colors.warningLight },
    { label: "Templates", value: templates.length, icon: "view-list", color: colors.accent, bg: colors.tealLight },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

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
        <View style={styles.headerTop}>
          <MKSLogo size="small" light />
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={styles.avatarBtn}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.userName}>{user?.displayName ?? "User"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase() ?? "VIEWER"}</Text>
        </View>
      </LinearGradient>

      {!isFirebaseReady && <SetupBanner />}

      <View style={styles.statsRow}>
        {statCards.map((card) => (
          <View key={card.label} style={[styles.statCard, { backgroundColor: card.bg, flex: 1 }]}>
            <MaterialIcons name={card.icon as any} size={20} color={card.color} />
            <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: card.color }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      <RoleGate minRole="editor">
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {templates.length > 0 ? (
              templates.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl.id}
                  onPress={() => router.push({ pathname: "/document/new", params: { templateId: tmpl.id } })}
                  style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickIcon, { backgroundColor: colors.tealLight }]}>
                    <Feather name="file-plus" size={18} color={colors.accent} />
                  </View>
                  <Text style={[styles.quickLabel, { color: colors.foreground }]} numberOfLines={2}>
                    {tmpl.name}
                  </Text>
                  <Text style={[styles.quickSub, { color: colors.mutedForeground }]}>
                    {tmpl.serviceType}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/document/new")}
                style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIcon, { backgroundColor: colors.tealLight }]}>
                  <Feather name="plus" size={18} color={colors.accent} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>New Document</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </RoleGate>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Documents</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/documents")}>
            <Text style={[styles.seeAll, { color: colors.accent }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : recentDocs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No documents yet</Text>
          </View>
        ) : (
          recentDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onPress={() => router.push({ pathname: "/document/[id]", params: { id: doc.id } })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 4,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  avatarBtn: { padding: 4 },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  avatarInitial: { color: "#fff", fontSize: 15, fontWeight: "700" },
  greeting: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  userName: { color: "#ffffff", fontSize: 24, fontWeight: "800" },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,128,128,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  roleText: { color: "#00c8c8", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: -16,
    gap: 8,
  },
  statCard: {
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600" },
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  quickScroll: { marginLeft: -4 },
  quickCard: {
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginRight: 10,
    marginLeft: 4,
    gap: 8,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
  quickSub: { fontSize: 11 },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14 },
});
