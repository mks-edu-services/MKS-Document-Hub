import { Feather } from "@/components/AppIcons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useServiceTypes } from "@/context/ServiceTypesContext";
import { useColors } from "@/hooks/useColors";
import { RoleRouteGate } from "@/components/RoleRouteGate";
import { createDocument, getDocuments, getTemplate, updateDocument, updateTemplate } from "@/lib/firestore";
import {
  buildTemplateWorkbookDownloadName,
  buildTemplateWorkbookImportPlan,
  buildTemplateWorkbookRows,
  createTemplateWorkbook,
  parseTemplateWorkbookRows,
  type TemplateWorkbookImportMode,
} from "@/lib/templateWorkbook";
import { FieldType, Template, TemplateField } from "@/types";
import * as XLSX from "xlsx";
import { getServiceTypeLabelFromValue, sortServiceTypes } from "@/lib/serviceTypes";

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

export default function EditTemplateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, language, translateFieldType } = useLanguage();
  const { serviceTypes, activeServiceTypes } = useServiceTypes();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportingWorkbook, setExportingWorkbook] = useState(false);
  const [importingWorkbook, setImportingWorkbook] = useState(false);
  const [importMode, setImportMode] = useState<TemplateWorkbookImportMode>("replace");

  useEffect(() => {
    if (serviceType) return;
    const defaultServiceType = activeServiceTypes[0]?.id || serviceTypes[0]?.id || "";
    if (defaultServiceType) setServiceType(defaultServiceType);
  }, [activeServiceTypes, serviceTypes, serviceType]);

  const visibleServiceTypes = useMemo(
    () => sortServiceTypes(activeServiceTypes.length > 0 ? activeServiceTypes : serviceTypes),
    [activeServiceTypes, serviceTypes],
  );

  useEffect(() => {
    if (id) {
      getTemplate(id).then((tmpl) => {
        if (tmpl) {
          setTemplate(tmpl);
          setName(tmpl.name);
          setServiceType(tmpl.serviceType);
          setDescription(tmpl.description ?? "");
          setActive(tmpl.active);
          setFields(tmpl.fields);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id]);

  function addField() {
    setFields((prev) => [...prev, { id: genId(), label: "", type: "text", required: false, placeholder: "", options: [] }]);
  }

  function updateField(fieldId: string, changes: Partial<TemplateField>) {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...changes } : f)));
  }

  function removeField(fieldId: string) {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert(t("required"), t("templateName") + " " + t("fieldRequired")); return; }
    const invalid = fields.find((f) => !f.label.trim());
    if (invalid) { Alert.alert(t("required"), t("fieldLabel") + " " + t("fieldRequired")); return; }

    setSaving(true);
    try {
      await updateTemplate(id!, { name: name.trim(), serviceType, description: description.trim(), active, fields });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert(t("error"), e?.message ?? t("failedToUpdateTemplate"));
    }
    setSaving(false);
  }

  async function handleDownloadBlankWorkbook() {
    if (!template) return;
    setExportingWorkbook(true);
    try {
      const workbook = createTemplateWorkbook(
        {
          ...template,
          fields,
        },
        [],
        true,
      );
      const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildTemplateWorkbookDownloadName({ ...template, fields }, "Blank_Template");
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? "Template workbook ကို download မလုပ်နိုင်ပါ။");
    } finally {
      setExportingWorkbook(false);
    }
  }

  async function handleExportWorkbook() {
    if (!template) return;
    setExportingWorkbook(true);
    try {
      const documents = await getDocuments();
      const templateDocuments = documents.filter((doc) => doc.templateId === template.id);
      const workbook = createTemplateWorkbook(
        {
          ...template,
          fields,
        },
        buildTemplateWorkbookRows({ ...template, fields }, templateDocuments),
        true,
      );
      const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildTemplateWorkbookDownloadName({ ...template, fields }, "Records_Export");
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? "Template export မလုပ်နိုင်ပါ။");
    } finally {
      setExportingWorkbook(false);
    }
  }

  function openImportPicker() {
    if (!template) return;
    if (Platform.OS !== "web") {
      Alert.alert(t("error"), "Excel import is supported on web/desktop only for now.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImportingWorkbook(true);
      try {
        const buffer = await file.arrayBuffer();
        const rows = parseTemplateWorkbookRows(buffer, { ...template, fields });
        const documents = await getDocuments();
        const templateDocuments = documents.filter((doc) => doc.templateId === template.id);
        const { plan } = buildTemplateWorkbookImportPlan({ ...template, fields }, rows, templateDocuments, importMode);
        let updated = 0;
        let created = 0;
        let skipped = 0;
        let ambiguous = 0;

        for (const item of plan) {
          if (item.action === "skip") {
            skipped += 1;
            if (item.reason === "ambiguous_signature") {
              ambiguous += 1;
            }
            continue;
          }

          if (item.action === "update" && item.documentId) {
            await updateDocument(item.documentId, item.payload as any);
            updated += 1;
            continue;
          }

          if (item.action === "create") {
            await createDocument(item.payload as any);
            created += 1;
          }
        }

        Alert.alert(
          t("driveTools"),
          `Import ပြီးပါပြီ\nUpdated: ${updated}\nCreated: ${created}\nSkipped: ${skipped}\nAmbiguous: ${ambiguous}`,
        );
      } catch (error: any) {
        Alert.alert(t("error"), error?.message ?? "Workbook import မလုပ်နိုင်ပါ။");
      } finally {
        setImportingWorkbook(false);
      }
    };
    input.click();
  }

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
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
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>{t("keepFormAndTemplateAligned")}</Text>
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                {t("keepFormAndTemplateAligned")}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("templateName")}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
              value={name}
              onChangeText={setName}
              placeholder={`e.g., ${t("templateName")}`}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("serviceType")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chips}>
                {visibleServiceTypes.map((svc) => (
                  <TouchableOpacity key={svc.id} onPress={() => setServiceType(svc.id)} style={[styles.chip, { backgroundColor: serviceType === svc.id ? colors.primary : colors.muted, borderColor: serviceType === svc.id ? colors.primary : colors.border }]} activeOpacity={0.8}>
                    <Text style={[styles.chipText, { color: serviceType === svc.id ? "#fff" : colors.foreground }]}>{getServiceTypeLabelFromValue(language, svc.id, serviceTypes)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("description")}</Text>
            <TextInput
              style={[styles.input, styles.multiline, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              placeholder={t("description")}
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: colors.foreground }]}>{t("active")}</Text>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.accent }} thumbColor="#fff" />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Excel Workbook</Text>
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            ဒီ template ရဲ့ record columns အကုန်ပါအောင် blank template / export / import / update လုပ်နိုင်ပါတယ်။
          </Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => setImportMode("replace")}
              style={[
                styles.modeChip,
                {
                  backgroundColor: importMode === "replace" ? colors.primary : colors.muted,
                  borderColor: importMode === "replace" ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeChipText, { color: importMode === "replace" ? "#fff" : colors.foreground }]}>
                Replace / Update
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setImportMode("append")}
              style={[
                styles.modeChip,
                {
                  backgroundColor: importMode === "append" ? colors.primary : colors.muted,
                  borderColor: importMode === "append" ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text style={[styles.modeChipText, { color: importMode === "append" ? "#fff" : colors.foreground }]}>
                Append New
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            Replace mode က app_document_id / row key ကိုသုံးပြီး ရှိပြီးသား record ကို update လုပ်မယ်။ Append mode က record အသစ်အဖြစ်ထပ်ထည့်မယ်။
          </Text>
          <View style={styles.workbookActions}>
            <TouchableOpacity
              onPress={() => void handleDownloadBlankWorkbook()}
              disabled={exportingWorkbook}
              style={[styles.workbookBtn, { backgroundColor: colors.navyLight, borderColor: colors.border }]}
              activeOpacity={0.85}
            >
              {exportingWorkbook ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Feather name="download" size={16} color={colors.primary} />
              )}
              <Text style={[styles.workbookBtnText, { color: colors.primary }]}>Blank Template</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleExportWorkbook()}
              disabled={exportingWorkbook}
              style={[styles.workbookBtn, { backgroundColor: colors.accent }]}
              activeOpacity={0.85}
            >
              {exportingWorkbook ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="file-text" size={16} color="#fff" />}
              <Text style={[styles.workbookBtnText, { color: "#fff" }]}>Export Records</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openImportPicker}
              disabled={importingWorkbook}
              style={[styles.workbookBtn, { backgroundColor: colors.primary }]}
              activeOpacity={0.85}
            >
              {importingWorkbook ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload" size={16} color="#fff" />}
              <Text style={[styles.workbookBtnText, { color: "#fff" }]}>
                {importMode === "replace" ? "Import Workbook" : "Append Workbook"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("fieldsCount")} ({fields.length})</Text>
            <TouchableOpacity onPress={addField} style={[styles.addFieldBtn, { backgroundColor: colors.tealLight }]} activeOpacity={0.8}>
              <Feather name="plus" size={15} color={colors.accent} />
              <Text style={[styles.addFieldText, { color: colors.accent }]}>{t("addField")}</Text>
            </TouchableOpacity>
          </View>

          {fields.map((field, index) => (
            <View key={field.id} style={[styles.fieldCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.fieldCardHeader}>
                <Text style={[styles.fieldNum, { color: colors.mutedForeground }]}>{t("field")} {index + 1}</Text>
                <TouchableOpacity onPress={() => removeField(field.id)}>
                  <Feather name="x" size={16} color={colors.destructive} />
                </TouchableOpacity>
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
                    <TouchableOpacity key={ft.value} onPress={() => updateField(field.id, { type: ft.value })} style={[styles.typeChip, { backgroundColor: field.type === ft.value ? colors.accent : colors.card, borderColor: field.type === ft.value ? colors.accent : colors.border }]} activeOpacity={0.8}>
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
              <TouchableOpacity onPress={() => updateField(field.id, { required: !field.required })} style={styles.requiredRow} activeOpacity={0.8}>
                <View style={[styles.checkbox, { backgroundColor: field.required ? colors.primary : "transparent", borderColor: field.required ? colors.primary : colors.border }]}>
                  {field.required && <Feather name="check" size={10} color="#fff" />}
                </View>
                <Text style={[styles.requiredText, { color: colors.foreground }]}>{t("requiredField")}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check" size={20} color="#fff" />}
          <Text style={styles.saveBtnText}>{t("updateTemplate")}</Text>
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
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  workbookActions: { gap: 8 },
  modeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  modeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  modeChipText: { fontSize: 12, fontWeight: "700" },
  workbookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  workbookBtnText: { fontSize: 14, fontWeight: "700" },
  addFieldBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addFieldText: { fontSize: 13, fontWeight: "700" },
  fieldCard: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 10 },
  fieldCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldNum: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14 },
  hintText: { fontSize: 12, lineHeight: 16 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  typeChipText: { fontSize: 11, fontWeight: "600" },
  requiredRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  requiredText: { fontSize: 13 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
