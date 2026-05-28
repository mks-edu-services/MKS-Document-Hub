import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoleGate } from "@/components/RoleGate";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { deleteDocument, getDocument, updateDocument } from "@/lib/firestore";
import { Document, DocumentStatus } from "@/types";

const statusConfig: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "#16a34a", bg: "#dcfce7" },
  draft: { label: "Draft", color: "#d97706", bg: "#fef3c7" },
  archived: { label: "Archived", color: "#6b7c93", bg: "#f0f4f8" },
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={ir.row}>
      <Feather name={icon as any} size={14} color={colors.accent} />
      <View style={ir.content}>
        <Text style={[ir.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[ir.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const ir = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  content: { flex: 1 },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  value: { fontSize: 15, marginTop: 2, fontWeight: "500" },
});

export default function DocumentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      getDocument(id).then((doc) => {
        setDocument(doc);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  async function handleStatusChange(newStatus: DocumentStatus) {
    if (!document) return;
    setUpdating(true);
    try {
      await updateDocument(document.id, { status: newStatus });
      setDocument((d) => d ? { ...d, status: newStatus } : d);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {
      Alert.alert("Error", "Failed to update status.");
    }
    setUpdating(false);
  }

  async function handleDelete() {
    if (!document) return;
    Alert.alert(
      "Delete Document",
      `Delete "${document.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDocument(document.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (_) {
              Alert.alert("Error", "Failed to delete document.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!document) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Document not found</Text>
      </View>
    );
  }

  const status = statusConfig[document.status];
  const createdDate = new Date(document.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <View style={[styles.serviceTag, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Text style={styles.serviceTagText}>{document.serviceType}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.docTitle}>{document.title}</Text>
        <Text style={styles.docStudent}>{document.studentName}</Text>
        <Text style={styles.docDate}>Created {createdDate}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>Document Details</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow icon="book-open" label="School / Institution" value={document.school} />
        <InfoRow icon="calendar" label="Academic Year" value={document.academicYear} />
        <InfoRow icon="user" label="Agent" value={document.agent} />
        <InfoRow icon="clock" label="Date" value={document.date} />
        {document.templateName && <InfoRow icon="layout" label="Template" value={document.templateName} />}
      </View>

      {Object.keys(document.fields).length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Additional Fields</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {Object.entries(document.fields).map(([key, value]) => (
            value ? (
              <View key={key} style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{key}</Text>
                <Text style={[styles.fieldValue, { color: colors.foreground }]}>{value}</Text>
              </View>
            ) : null
          ))}
        </View>
      )}

      {document.notes ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Notes</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.notes, { color: colors.foreground }]}>{document.notes}</Text>
        </View>
      ) : null}

      <RoleGate minRole="editor">
        <View style={styles.actionsCard}>
          <Text style={[styles.actionsTitle, { color: colors.mutedForeground }]}>Change Status</Text>
          <View style={styles.statusBtns}>
            {(["active", "draft", "archived"] as DocumentStatus[]).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => handleStatusChange(s)}
                disabled={document.status === s || updating}
                style={[
                  styles.statusBtn,
                  {
                    backgroundColor: document.status === s ? statusConfig[s].bg : colors.muted,
                    borderColor: document.status === s ? statusConfig[s].color : colors.border,
                    opacity: document.status === s ? 1 : 0.8,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.statusBtnText, { color: document.status === s ? statusConfig[s].color : colors.mutedForeground }]}>
                  {statusConfig[s].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <RoleGate minRole="admin">
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.deleteBtn, { borderColor: colors.destructive }]}
              activeOpacity={0.8}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
              <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>Delete Document</Text>
            </TouchableOpacity>
          </RoleGate>
        </View>
      </RoleGate>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 15 },
  headerCard: {
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  serviceTagText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "700" },
  docTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 28 },
  docStudent: { color: "rgba(255,255,255,0.8)", fontSize: 15 },
  docDate: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  divider: { height: 1, marginVertical: 10 },
  fieldRow: { paddingVertical: 8, gap: 2 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  fieldValue: { fontSize: 15, fontWeight: "500" },
  notes: { fontSize: 14, lineHeight: 22 },
  actionsCard: { gap: 12 },
  actionsTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  statusBtns: { flexDirection: "row", gap: 8 },
  statusBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  statusBtnText: { fontSize: 13, fontWeight: "700" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700" },
});
