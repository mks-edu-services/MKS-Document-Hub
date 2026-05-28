import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { createDocument, getTemplates } from "@/lib/firestore";
import { Document, Template } from "@/types";

const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023", "2021-2022", "2020-2021"];
const SERVICE_TYPES = ["Degree Certificate", "Notary", "Transcript", "Translation", "Other"];

interface FormData {
  title: string;
  studentName: string;
  school: string;
  academicYear: string;
  agent: string;
  date: string;
  notes: string;
  templateId: string;
  serviceType: string;
  fields: Record<string, string>;
}

function FieldInput({ label, value, onChangeText, placeholder, multiline = false, required = false, colors }: any) {
  return (
    <View style={fi.group}>
      <Text style={[fi.label, { color: colors.foreground }]}>
        {label}{required && <Text style={{ color: colors.destructive }}> *</Text>}
      </Text>
      <TextInput
        style={[
          fi.input,
          { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground },
          multiline && fi.multiline,
        ]}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

const fi = StyleSheet.create({
  group: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  multiline: { minHeight: 80, paddingTop: 10 },
});

export default function NewDocumentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ templateId?: string }>();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [form, setForm] = useState<FormData>({
    title: "",
    studentName: "",
    school: "",
    academicYear: ACADEMIC_YEARS[0],
    agent: user?.displayName ?? "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    templateId: "",
    serviceType: SERVICE_TYPES[0],
    fields: {},
  });

  useEffect(() => {
    (async () => {
      const tmps = await getTemplates().catch(() => []);
      setTemplates(tmps);
      if (params.templateId) {
        const tmpl = tmps.find((t) => t.id === params.templateId);
        if (tmpl) applyTemplate(tmpl);
      }
      setLoadingTemplates(false);
    })();
  }, []);

  function applyTemplate(tmpl: Template) {
    setSelectedTemplate(tmpl);
    setForm((f) => ({
      ...f,
      templateId: tmpl.id,
      serviceType: tmpl.serviceType,
      title: f.title || `${tmpl.name} – `,
      fields: Object.fromEntries(tmpl.fields.map((field) => [field.id, f.fields[field.id] ?? ""])),
    }));
  }

  function setField(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDynamicField(id: string, value: string) {
    setForm((f) => ({ ...f, fields: { ...f.fields, [id]: value } }));
  }

  async function handleSave(status: "draft" | "active") {
    if (!form.title.trim()) { Alert.alert("Required", "Please enter a document title."); return; }
    if (!form.studentName.trim()) { Alert.alert("Required", "Please enter the student name."); return; }

    setSaving(true);
    try {
      const docData: Omit<Document, "id" | "createdAt" | "updatedAt"> = {
        title: form.title.trim(),
        studentName: form.studentName.trim(),
        school: form.school.trim(),
        academicYear: form.academicYear,
        agent: form.agent.trim(),
        date: form.date,
        templateId: form.templateId,
        templateName: selectedTemplate?.name ?? "",
        serviceType: form.serviceType,
        fields: form.fields,
        notes: form.notes.trim(),
        status,
        createdBy: user?.uid ?? "",
      };
      await createDocument(docData);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save document.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Template</Text>
          {loadingTemplates ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : templates.length === 0 ? (
            <Text style={[styles.noTemplate, { color: colors.mutedForeground }]}>
              No templates available. An admin must create one first.
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
              {templates.map((tmpl) => (
                <TouchableOpacity
                  key={tmpl.id}
                  onPress={() => applyTemplate(tmpl)}
                  style={[
                    styles.templateChip,
                    {
                      backgroundColor: selectedTemplate?.id === tmpl.id ? colors.primary : colors.muted,
                      borderColor: selectedTemplate?.id === tmpl.id ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.templateChipText, { color: selectedTemplate?.id === tmpl.id ? "#fff" : colors.foreground }]}>
                    {tmpl.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Service Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
            {SERVICE_TYPES.map((svc) => (
              <TouchableOpacity
                key={svc}
                onPress={() => setField("serviceType", svc)}
                style={[
                  styles.templateChip,
                  {
                    backgroundColor: form.serviceType === svc ? colors.accent : colors.muted,
                    borderColor: form.serviceType === svc ? colors.accent : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.templateChipText, { color: form.serviceType === svc ? "#fff" : colors.foreground }]}>
                  {svc}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
          <FieldInput label="Document Title" value={form.title} onChangeText={(v: string) => setField("title", v)} required colors={colors} />
          <FieldInput label="Student Name" value={form.studentName} onChangeText={(v: string) => setField("studentName", v)} required colors={colors} />
          <FieldInput label="School / Institution" value={form.school} onChangeText={(v: string) => setField("school", v)} colors={colors} />
          <FieldInput label="Agent / Processed By" value={form.agent} onChangeText={(v: string) => setField("agent", v)} colors={colors} />
          <FieldInput label="Date" value={form.date} onChangeText={(v: string) => setField("date", v)} placeholder="YYYY-MM-DD" colors={colors} />

          <View style={fi.group}>
            <Text style={[fi.label, { color: colors.foreground }]}>Academic Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
              {ACADEMIC_YEARS.map((yr) => (
                <TouchableOpacity
                  key={yr}
                  onPress={() => setField("academicYear", yr)}
                  style={[
                    styles.templateChip,
                    {
                      backgroundColor: form.academicYear === yr ? colors.primary : colors.muted,
                      borderColor: form.academicYear === yr ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.templateChipText, { color: form.academicYear === yr ? "#fff" : colors.foreground }]}>
                    {yr}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {selectedTemplate && selectedTemplate.fields.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {selectedTemplate.name} Fields
            </Text>
            {selectedTemplate.fields.map((field) => (
              <FieldInput
                key={field.id}
                label={field.label}
                value={form.fields[field.id] ?? ""}
                onChangeText={(v: string) => setDynamicField(field.id, v)}
                placeholder={field.placeholder}
                multiline={field.type === "textarea"}
                required={field.required}
                colors={colors}
              />
            ))}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Notes</Text>
          <FieldInput label="Additional Notes" value={form.notes} onChangeText={(v: string) => setField("notes", v)} multiline colors={colors} />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleSave("draft")}
            disabled={saving}
            style={[styles.draftBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="save" size={18} color={colors.primary} />}
            <Text style={[styles.draftBtnText, { color: colors.primary }]}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSave("active")}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check" size={18} color="#fff" />}
            <Text style={styles.saveBtnText}>Save & Activate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  templateScroll: { marginBottom: 4 },
  templateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  templateChipText: { fontSize: 13, fontWeight: "600" },
  noTemplate: { fontSize: 13, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  draftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
  },
  draftBtnText: { fontSize: 15, fontWeight: "700" },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
