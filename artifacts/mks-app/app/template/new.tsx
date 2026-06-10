import { Feather } from "@/components/AppIcons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
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
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { RoleRouteGate } from "@/components/RoleRouteGate";
import { createTemplate } from "@/lib/firestore";
import { FieldType, Template, TemplateField } from "@/types";

const SERVICE_TYPES = ["Degree Certificate", "Notary", "Transcript", "Translation", "Other"];
const FIELD_TYPES: { label: string; value: FieldType }[] = [
  { label: "Text", value: "text" },
  { label: "Long Text", value: "textarea" },
  { label: "Date", value: "date" },
  { label: "Number", value: "number" },
  { label: "Dropdown", value: "select" },
  { label: "Email", value: "email" },
  { label: "Phone", value: "phone" },
];
const FIELD_TYPE_HINTS: Record<FieldType, string> = {
  text: "Short values like names, IDs, or reference numbers.",
  textarea: "Longer notes, remarks, or multi-line text.",
  date: "Use when the document needs a specific date.",
  number: "Use for numeric values only.",
  select: "Define choices separated by commas so the form can render as options.",
  email: "Use for contact email addresses.",
  phone: "Use for phone numbers or WhatsApp numbers.",
};

function genId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 7);
}

function parseOptions(raw: string) {
  return raw
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
}

export default function NewTemplateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, translateServiceType, translateFieldType } = useLanguage();

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [saving, setSaving] = useState(false);

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: genId(), label: "", type: "text", required: false, placeholder: "", options: [] },
    ]);
  }

  function updateField(id: string, changes: Partial<TemplateField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...changes } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function moveField(id: string, dir: "up" | "down") {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert("Required", "Please enter a template name."); return; }
    const invalidField = fields.find((f) => !f.label.trim());
    if (invalidField) { Alert.alert("Required", "All fields must have a label."); return; }

    setSaving(true);
    try {
      await createTemplate({
        name: name.trim(),
        serviceType,
        description: description.trim(),
        fields,
        createdBy: user?.uid ?? "",
        active: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create template.");
    }
    setSaving(false);
  }

  return (
    <RoleRouteGate exactRole="admin">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("templateInfo")}</Text>
          <View style={[styles.tipBox, { backgroundColor: colors.tealLight, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.accent} />
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>{t("howThisTemplateWorks")}</Text>
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                {t("keepFormAndTemplateAligned")}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("templateName")} <Text style={{ color: colors.destructive }}>*</Text></Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder={`e.g., ${t("templateName")}`}
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("serviceType")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chips}>
                {SERVICE_TYPES.map((svc) => (
                  <TouchableOpacity
                    key={svc}
                  onPress={() => setServiceType(svc)}
                  style={[styles.chip, { backgroundColor: serviceType === svc ? colors.primary : colors.muted, borderColor: serviceType === svc ? colors.primary : colors.border }]}
                  activeOpacity={0.8}
                >
                    <Text style={[styles.chipText, { color: serviceType === svc ? "#fff" : colors.foreground }]}>{translateServiceType(svc)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("description")}</Text>
            <TextInput
              style={[styles.input, styles.multiline, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder={t("description")}
              placeholderTextColor={colors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {t("customFields")} ({fields.length})
            </Text>
            <TouchableOpacity
              onPress={addField}
              style={[styles.addFieldBtn, { backgroundColor: colors.tealLight }]}
              activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color={colors.accent} />
              <Text style={[styles.addFieldText, { color: colors.accent }]}>{t("addField")}</Text>
            </TouchableOpacity>
          </View>

          {fields.length === 0 ? (
            <View style={[styles.emptyFields, { borderColor: colors.border }]}>
              <Feather name="plus-square" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyFieldsText, { color: colors.mutedForeground }]}>
                {t("noCustomFieldsYet")}
              </Text>
            </View>
          ) : (
            fields.map((field, index) => (
              <View key={field.id} style={[styles.fieldCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={styles.fieldCardHeader}>
                  <Text style={[styles.fieldNum, { color: colors.mutedForeground }]}>{t("field")} {index + 1}</Text>
                  <View style={styles.fieldCardActions}>
                    <TouchableOpacity onPress={() => moveField(field.id, "up")} disabled={index === 0}>
                      <Feather name="chevron-up" size={16} color={index === 0 ? colors.border : colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveField(field.id, "down")} disabled={index === fields.length - 1}>
                      <Feather name="chevron-down" size={16} color={index === fields.length - 1 ? colors.border : colors.mutedForeground} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeField(field.id)}>
                      <Feather name="x" size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TextInput
                  style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                  placeholder={`${t("fieldLabel")} (e.g., Certificate Number)`}
                  placeholderTextColor={colors.mutedForeground}
                  value={field.label}
                  onChangeText={(v) => updateField(field.id, { label: v })}
                />

                <TextInput
                  style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                  placeholder={`${t("placeholderText")} (optional)`}
                  placeholderTextColor={colors.mutedForeground}
                  value={field.placeholder ?? ""}
                  onChangeText={(v) => updateField(field.id, { placeholder: v })}
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chips}>
                    {FIELD_TYPES.map((ft) => (
                      <TouchableOpacity
                        key={ft.value}
                        onPress={() => updateField(field.id, { type: ft.value })}
                        style={[styles.typeChip, { backgroundColor: field.type === ft.value ? colors.accent : colors.card, borderColor: field.type === ft.value ? colors.accent : colors.border }]}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.typeChipText, { color: field.type === ft.value ? "#fff" : colors.mutedForeground }]}>{translateFieldType(ft.value)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                  {FIELD_TYPE_HINTS[field.type]}
                </Text>

                {field.type === "select" && (
                  <View style={styles.fieldGroup}>
                    <Text style={[styles.label, { color: colors.foreground }]}>{t("selectOptions")}</Text>
                    <TextInput
                      style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                      placeholder="Option 1, Option 2, Option 3"
                      placeholderTextColor={colors.mutedForeground}
                      value={(field.options ?? []).join(", ")}
                      onChangeText={(v) => updateField(field.id, { options: parseOptions(v) })}
                    />
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => updateField(field.id, { required: !field.required })}
                  style={styles.requiredRow}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, { backgroundColor: field.required ? colors.primary : "transparent", borderColor: field.required ? colors.primary : colors.border }]}>
                    {field.required && <Feather name="check" size={10} color="#fff" />}
                  </View>
                  <Text style={[styles.requiredText, { color: colors.foreground }]}>{t("requiredField")}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="check" size={20} color="#fff" />
          )}
          <Text style={styles.saveBtnText}>{t("createTemplate")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </RoleRouteGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  multiline: { minHeight: 72, paddingTop: 10 },
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  tipTextWrap: { flex: 1, gap: 3 },
  tipTitle: { fontSize: 13, fontWeight: "700" },
  tipText: { fontSize: 12.5, lineHeight: 18 },
  chips: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  addFieldBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addFieldText: { fontSize: 13, fontWeight: "700" },
  emptyFields: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyFieldsText: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  fieldCard: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 10 },
  fieldCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldNum: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  fieldCardActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14 },
  hintText: { fontSize: 12, lineHeight: 16 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  typeChipText: { fontSize: 11, fontWeight: "600" },
  requiredRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  requiredText: { fontSize: 13 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
