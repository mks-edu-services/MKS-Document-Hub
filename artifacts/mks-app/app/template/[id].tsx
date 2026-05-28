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
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getTemplate, updateTemplate } from "@/lib/firestore";
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

function genId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 7);
}

export default function EditTemplateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    setFields((prev) => [...prev, { id: genId(), label: "", type: "text", required: false }]);
  }

  function updateField(fieldId: string, changes: Partial<TemplateField>) {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...changes } : f)));
  }

  function removeField(fieldId: string) {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert("Required", "Template name is required."); return; }
    const invalid = fields.find((f) => !f.label.trim());
    if (invalid) { Alert.alert("Required", "All fields need a label."); return; }

    setSaving(true);
    try {
      await updateTemplate(id!, { name: name.trim(), serviceType, description: description.trim(), active, fields });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to update template.");
    }
    setSaving(false);
  }

  if (loading) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
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
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Template Info</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Name</Text>
            <TextInput style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]} value={name} onChangeText={setName} placeholderTextColor={colors.mutedForeground} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Service Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chips}>
                {SERVICE_TYPES.map((svc) => (
                  <TouchableOpacity key={svc} onPress={() => setServiceType(svc)} style={[styles.chip, { backgroundColor: serviceType === svc ? colors.primary : colors.muted, borderColor: serviceType === svc ? colors.primary : colors.border }]} activeOpacity={0.8}>
                    <Text style={[styles.chipText, { color: serviceType === svc ? "#fff" : colors.foreground }]}>{svc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Description</Text>
            <TextInput style={[styles.input, styles.multiline, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground }]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholderTextColor={colors.mutedForeground} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: colors.foreground }]}>Active</Text>
            <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.accent }} thumbColor="#fff" />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Fields ({fields.length})</Text>
            <TouchableOpacity onPress={addField} style={[styles.addFieldBtn, { backgroundColor: colors.tealLight }]} activeOpacity={0.8}>
              <Feather name="plus" size={15} color={colors.accent} />
              <Text style={[styles.addFieldText, { color: colors.accent }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {fields.map((field, index) => (
            <View key={field.id} style={[styles.fieldCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <View style={styles.fieldCardHeader}>
                <Text style={[styles.fieldNum, { color: colors.mutedForeground }]}>Field {index + 1}</Text>
                <TouchableOpacity onPress={() => removeField(field.id)}>
                  <Feather name="x" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.fieldInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                placeholder="Field label"
                placeholderTextColor={colors.mutedForeground}
                value={field.label}
                onChangeText={(v) => updateField(field.id, { label: v })}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chips}>
                  {FIELD_TYPES.map((ft) => (
                    <TouchableOpacity key={ft.value} onPress={() => updateField(field.id, { type: ft.value })} style={[styles.typeChip, { backgroundColor: field.type === ft.value ? colors.accent : colors.card, borderColor: field.type === ft.value ? colors.accent : colors.border }]} activeOpacity={0.8}>
                      <Text style={[styles.typeChipText, { color: field.type === ft.value ? "#fff" : colors.mutedForeground }]}>{ft.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity onPress={() => updateField(field.id, { required: !field.required })} style={styles.requiredRow} activeOpacity={0.8}>
                <View style={[styles.checkbox, { backgroundColor: field.required ? colors.primary : "transparent", borderColor: field.required ? colors.primary : colors.border }]}>
                  {field.required && <Feather name="check" size={10} color="#fff" />}
                </View>
                <Text style={[styles.requiredText, { color: colors.foreground }]}>Required</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check" size={20} color="#fff" />}
          <Text style={styles.saveBtnText}>Update Template</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  chips: { flexDirection: "row", gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addFieldBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  addFieldText: { fontSize: 13, fontWeight: "700" },
  fieldCard: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 10 },
  fieldCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldNum: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, fontSize: 14 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  typeChipText: { fontSize: 11, fontWeight: "600" },
  requiredRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  requiredText: { fontSize: 13 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
