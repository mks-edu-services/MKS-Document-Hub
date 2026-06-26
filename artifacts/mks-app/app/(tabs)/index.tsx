import { Feather, MaterialIcons } from "@/components/AppIcons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DocumentCard } from "@/components/DocumentCard";
import { MKSLogo } from "@/components/MKSLogo";
import { RoleGate } from "@/components/RoleGate";
import { SetupBanner } from "@/components/SetupBanner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useServiceTypes } from "@/context/ServiceTypesContext";
import { useColors } from "@/hooks/useColors";
import { subscribeToDocuments, subscribeToTemplates } from "@/lib/firestore";
import { getServiceTypeLabelFromValue } from "@/lib/serviceTypes";
import { Document, Template } from "@/types";

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isFirebaseReady } = useAuth();
  const { t, language } = useLanguage();
  const { serviceTypes } = useServiceTypes();
  const { width } = useWindowDimensions();
  const { scrollTop } = useLocalSearchParams<{ scrollTop?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const isCompact = width < 720;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const headerTopPad = isCompact ? topPad + 4 : topPad + 16;

  useEffect(() => {
    if (!isFirebaseReady) { setLoading(false); return; }
    let loaded = { docs: false, tmps: false };
    let failed = { docs: false, tmps: false };
    const check = () => {
      if ((loaded.docs || failed.docs) && (loaded.tmps || failed.tmps)) setLoading(false);
    };

    const unsubDocs = subscribeToDocuments((docs) => {
      setDocuments(docs);
      loaded.docs = true;
      check();
    }, () => {
      failed.docs = true;
      setDocuments([]);
      check();
    });
    const unsubTmps = subscribeToTemplates((tmps) => {
      setTemplates(tmps);
      loaded.tmps = true;
      check();
    }, true, () => {
      failed.tmps = true;
      setTemplates([]);
      check();
    });

    return () => { unsubDocs(); unsubTmps(); };
  }, [isFirebaseReady]);

  useEffect(() => {
    if (!scrollTop) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollTop]);

  const recentDocs = documents.slice(0, 5);
  const totalDocs = documents.length;
  const activeDocs = documents.filter(d => d.status === "active").length;
  const draftDocs = documents.filter(d => d.status === "draft").length;

  const statCards: StatCard[] = [
    { label: t("total"), value: totalDocs, icon: "insert-drive-file", color: colors.primary, bg: colors.navyLight },
    { label: t("active"), value: activeDocs, icon: "check-circle", color: colors.success, bg: colors.successLight },
    { label: t("drafts"), value: draftDocs, icon: "edit", color: colors.warning, bg: colors.warningLight },
    { label: t("templates"), value: templates.length, icon: "view-list", color: colors.accent, bg: colors.tealLight },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t("dashboardGreetingMorning");
    if (h < 17) return t("dashboardGreetingAfternoon");
    return t("dashboardGreetingEvening");
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.navyDark, colors.navyMid]}
        style={[styles.header, isCompact && styles.headerCompact, { paddingTop: headerTopPad }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.headerTop, isCompact && styles.headerTopCompact]}>
          <MKSLogo size={isCompact ? "small" : "small"} variant={isCompact ? "icon" : "full"} light />
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} style={[styles.avatarBtn, isCompact && styles.avatarBtnCompact]}>
            <View style={[styles.avatarCircle, isCompact && styles.avatarCircleCompact]}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarInitial, isCompact && styles.avatarInitialCompact]}>
                  {user?.displayName?.charAt(0)?.toUpperCase() ?? "U"}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
        <Text style={[styles.greeting, isCompact && styles.greetingCompact]}>{greeting()},</Text>
        <Text style={[styles.userName, isCompact && styles.userNameCompact]} numberOfLines={1}>
          {user?.displayName ?? "User"}
        </Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{(user?.role ?? "viewer").toUpperCase()}</Text>
        </View>
      </LinearGradient>

      {!isFirebaseReady && <SetupBanner />}

      <View style={[styles.statsRow, isCompact && styles.statsRowCompact]}>
        {statCards.map((card) => (
          <View key={card.label} style={[styles.statCard, isCompact && styles.statCardCompact, { backgroundColor: card.bg, flex: 1 }]}>
            <MaterialIcons name={card.icon as any} size={20} color={card.color} />
            <Text style={[styles.statValue, isCompact && styles.statValueCompact, { color: card.color }]}>{card.value}</Text>
            <Text style={[styles.statLabel, isCompact && styles.statLabelCompact, { color: card.color }]} numberOfLines={1}>
              {card.label}
            </Text>
          </View>
        ))}
      </View>

      <RoleGate minRole="editor">
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("quickAdd")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
            {templates.length > 0 ? (
              templates.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl.id}
                  onPress={() => router.push({ pathname: "/document/new", params: { templateId: tmpl.id } })}
                  style={[styles.quickCard, isCompact && styles.quickCardCompact, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickIcon, isCompact && styles.quickIconCompact, { backgroundColor: colors.tealLight }]}>
                    <Feather name="file-plus" size={18} color={colors.accent} />
                  </View>
                  <Text style={[styles.quickLabel, isCompact && styles.quickLabelCompact, { color: colors.foreground }]} numberOfLines={2}>
                    {tmpl.name}
                  </Text>
                  <Text style={[styles.quickSub, isCompact && styles.quickSubCompact, { color: colors.mutedForeground }]} numberOfLines={1}>
                    {getServiceTypeLabelFromValue(language, tmpl.serviceType, serviceTypes)}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity
                onPress={() => router.push("/document/new")}
                style={[styles.quickCard, isCompact && styles.quickCardCompact, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIcon, isCompact && styles.quickIconCompact, { backgroundColor: colors.tealLight }]}>
                  <Feather name="plus" size={18} color={colors.accent} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{t("newDocument")}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </RoleGate>

      <View style={[styles.section, isCompact && styles.sectionCompact]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t("recentDocuments")}</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/documents")}>
            <Text style={[styles.seeAll, { color: colors.accent }]}>{t("seeAll")}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : recentDocs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t("noDocumentsYet")}</Text>
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
    paddingBottom: 12,
    gap: 4,
  },
  headerCompact: { paddingBottom: 4, gap: 1 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTopCompact: { marginBottom: 4 },
  avatarBtn: { padding: 4 },
  avatarBtnCompact: { padding: 2 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarCircleCompact: { width: 42, height: 42, borderRadius: 21 },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { color: "#fff", fontSize: 16, fontWeight: "700" },
  avatarInitialCompact: { fontSize: 17 },
  greeting: { color: "rgba(255,255,255,0.7)", fontSize: 14 },
  greetingCompact: { fontSize: 11, lineHeight: 14 },
  userName: { color: "#ffffff", fontSize: 24, fontWeight: "800" },
  userNameCompact: { fontSize: 16, lineHeight: 19 },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,128,128,0.35)",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 2,
  },
  roleText: { color: "#00c8c8", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: -12,
    gap: 7,
  },
  statsRowCompact: { flexWrap: "wrap", gap: 6, marginHorizontal: 12, marginTop: -10 },
  statCard: {
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 3,
  },
  statCardCompact: { flexBasis: "48%", paddingVertical: 4, paddingHorizontal: 6, gap: 1, minHeight: 56 },
  statValue: { fontSize: 18, fontWeight: "800" },
  statValueCompact: { fontSize: 13, lineHeight: 16 },
  statLabel: { fontSize: 10, fontWeight: "600" },
  statLabelCompact: { fontSize: 8, lineHeight: 10 },
  section: { marginHorizontal: 16, marginTop: 14 },
  sectionCompact: { marginTop: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  seeAll: { fontSize: 14, fontWeight: "600" },
  quickScroll: { marginLeft: -4 },
  quickCard: {
    width: 112,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginRight: 10,
    marginLeft: 4,
    gap: 6,
  },
  quickCardCompact: { width: 88, padding: 6, gap: 6 },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconCompact: { width: 28, height: 28 },
  quickLabel: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  quickLabelCompact: { fontSize: 10, lineHeight: 12 },
  quickSub: { fontSize: 10 },
  quickSubCompact: { fontSize: 8, lineHeight: 10 },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyText: { fontSize: 14 },
});
