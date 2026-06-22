import { Feather } from "@/components/AppIcons";
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
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useServiceTypes } from "@/context/ServiceTypesContext";
import { useColors } from "@/hooks/useColors";
import { DriveStatusBanner } from "@/components/DriveStatusBanner";
import { RegistryFieldsTable } from "@/components/RegistryFieldsTable";
import { createDocument, getTemplates, updateDocument } from "@/lib/firestore";
import { classifyDriveUploadError, extractDriveFileId, normalizeDriveFileUrl, uploadDocumentToDrive } from "@/lib/driveUpload";
import { RoleRouteGate } from "@/components/RoleRouteGate";
import { getRegistryDisplayTitle, getRegistryFieldDefinitions } from "@/lib/registry";
import { Document, Template } from "@/types";
import { getDocument } from "@/lib/firestore";
import { getServiceTypeLabelFromValue, sortServiceTypes } from "@/lib/serviceTypes";

const ACADEMIC_YEARS = ["2024-2025", "2023-2024", "2022-2023", "2021-2022", "2020-2021"];
const FIELD_TYPE_HINTS = {
  text: "Short values like names, IDs, or reference numbers.",
  textarea: "Longer notes, remarks, or multi-line text.",
  date: "Use when the document needs a specific date.",
  number: "Use for numeric values only.",
  select: "Pick one of the template-defined options below.",
  email: "Use for contact email addresses.",
  phone: "Use for phone numbers or WhatsApp numbers.",
} as const;

const REGISTRY_TEMPLATE_ID = "registry-2025-certificate";

interface FormData {
  title: string;
  studentName: string;
  school: string;
  academicYear: string;
  agent: string;
  date: string;
  notes: string;
  driveFileUrl: string;
  templateId: string;
  serviceType: string;
  fields: Record<string, string>;
}

function FieldInput({ field, value, onChangeText, placeholder, multiline = false, required = false, colors, labelText, hintText }: any) {
  if (field?.type === "select") {
    const options = field.options ?? [];
    return (
      <View style={fi.group}>
        <Text style={[fi.label, { color: colors.foreground }]}>
          {labelText ?? field.label}{required && <Text style={{ color: colors.destructive }}> *</Text>}
        </Text>
        <Text style={[fi.hint, { color: colors.mutedForeground }]}>
          {hintText ?? FIELD_TYPE_HINTS.select}
        </Text>
        {options.length > 0 ? (
          <View style={fi.chipWrap}>
            {options.map((option: string) => {
              const isSelected = value === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => onChangeText(option)}
                  style={[
                    fi.choiceChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.muted,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={[fi.choiceChipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <TextInput
            style={[
              fi.input,
              { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground },
            ]}
            placeholder="Define select options in the template first"
            placeholderTextColor={colors.mutedForeground}
            value={value}
            onChangeText={onChangeText}
          />
        )}
      </View>
    );
  }

  return (
    <View style={fi.group}>
      <Text style={[fi.label, { color: colors.foreground }]}>
        {labelText ?? field?.label ?? "Field"}{required && <Text style={{ color: colors.destructive }}> *</Text>}
      </Text>
      <TextInput
        style={[
          fi.input,
          { borderColor: colors.border, backgroundColor: colors.muted, color: colors.foreground },
          multiline && fi.multiline,
        ]}
        placeholder={placeholder ?? `Enter ${String(labelText ?? field?.label ?? "value").toLowerCase()}`}
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
  hint: { fontSize: 12, lineHeight: 16, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  multiline: { minHeight: 80, paddingTop: 10 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  choiceChipText: { fontSize: 13, fontWeight: "600" },
});

export default function NewDocumentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { language, t, formatDate, translateStatus, localizeFieldLabel, localizePlaceholder } = useLanguage();
  const { serviceTypes, activeServiceTypes } = useServiceTypes();
  const params = useLocalSearchParams<{ templateId?: string; id?: string }>();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingDocument, setLoadingDocument] = useState(Boolean(params.id));
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(params.id ?? null);
  const [existingDocument, setExistingDocument] = useState<Document | null>(null);

  const [form, setForm] = useState<FormData>({
    title: "",
    studentName: "",
    school: "",
    academicYear: ACADEMIC_YEARS[0],
    agent: user?.displayName ?? "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    driveFileUrl: "",
    templateId: "",
    serviceType: "",
    fields: {},
  });

  function buildFormFromDocument(doc: Document): FormData {
    return {
      title: doc.title ?? "",
      studentName: doc.studentName ?? "",
      school: doc.school ?? "",
      academicYear: doc.academicYear ?? ACADEMIC_YEARS[0],
      agent: doc.agent ?? "",
      date: doc.date ?? new Date().toISOString().split("T")[0],
      notes: doc.notes ?? "",
      driveFileUrl: doc.driveFileUrl ?? "",
      templateId: doc.templateId ?? "",
      serviceType: doc.serviceType ?? "",
      fields: { ...(doc.fields ?? {}) },
    };
  }

  useEffect(() => {
    (async () => {
      const tmps = await getTemplates().catch(() => []);
      setTemplates(tmps);
      if (params.id) {
        const existing = await getDocument(params.id).catch(() => null);
        if (existing) {
          setExistingDocument(existing);
          setEditingDocumentId(existing.id);
          setForm(buildFormFromDocument(existing));
          const existingTemplate = tmps.find((t) => t.id === existing.templateId) ?? null;
          setSelectedTemplate(existingTemplate);
        }
        setLoadingDocument(false);
      } else if (params.templateId) {
        const tmpl = tmps.find((t) => t.id === params.templateId);
        if (tmpl) applyTemplate(tmpl);
      }
      setLoadingTemplates(false);
    })();
  }, []);

  useEffect(() => {
    if (!editingDocumentId) return;
    const matchingTemplate = templates.find((template) => template.id === form.templateId) ?? null;
    setSelectedTemplate(matchingTemplate);
  }, [editingDocumentId, form.templateId, templates]);

  useEffect(() => {
    if (form.serviceType) return;
    const preferredServiceType =
      selectedTemplate?.serviceType ||
      activeServiceTypes[0]?.id ||
      serviceTypes[0]?.id ||
      "";
    if (preferredServiceType) {
      setForm((current) => ({ ...current, serviceType: preferredServiceType }));
    }
  }, [activeServiceTypes, selectedTemplate?.serviceType, serviceTypes, form.serviceType]);

  useEffect(() => {
    if (!form.serviceType || templates.length === 0) return;

    const matchingTemplates = templates.filter((template) => template.serviceType === form.serviceType);
    if (matchingTemplates.length === 0) {
      if (selectedTemplate?.serviceType !== form.serviceType) {
        setSelectedTemplate(null);
        setForm((current) => ({ ...current, templateId: "" }));
      }
      return;
    }

    if (selectedTemplate && matchingTemplates.some((template) => template.id === selectedTemplate.id)) {
      return;
    }

    const requestedTemplate = params.templateId
      ? matchingTemplates.find((template) => template.id === params.templateId)
      : null;
    const existingTemplate = editingDocumentId && existingDocument?.templateId
      ? matchingTemplates.find((template) => template.id === existingDocument.templateId)
      : null;
    applyTemplate(requestedTemplate ?? existingTemplate ?? matchingTemplates[0]);
  }, [editingDocumentId, existingDocument?.templateId, form.serviceType, params.templateId, selectedTemplate, templates]);

  function applyTemplate(tmpl: Template) {
    setSelectedTemplate(tmpl);
    setForm((f) => ({
      ...f,
      templateId: tmpl.id,
      serviceType: tmpl.serviceType,
      title: f.title || tmpl.name,
      fields: Object.fromEntries(tmpl.fields.map((field) => [field.id, f.fields[field.id] ?? ""])),
    }));
  }

  function setField(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDynamicField(id: string, value: string) {
    setForm((f) => ({ ...f, fields: { ...f.fields, [id]: value } }));
  }

  const visibleServiceTypes = sortServiceTypes(
    (() => {
      const currentServiceType = form.serviceType
        ? serviceTypes.find((serviceType) => serviceType.id === form.serviceType)
        : null;
      const combined = [...activeServiceTypes];
      if (currentServiceType && !combined.some((serviceType) => serviceType.id === currentServiceType.id)) {
        combined.push(currentServiceType);
      }
      return combined;
    })(),
  );

  const selectedServiceTypeLabel = getServiceTypeLabelFromValue(language, form.serviceType, serviceTypes);
  const matchingTemplates = templates.filter((template) => template.serviceType === form.serviceType);

  function syncRegistryField(id: string, value: string) {
    setForm((current) => {
      const fields = { ...current.fields, [id]: value };
      const nextStudentName = id === "name" ? value : current.studentName;
      const nextSchool = id === "township" ? value : current.school;
      const nextAgent = id === "submittedBy" ? value : current.agent;
      const nextDate = (id === "receivedDate" || id === "submittedDate" || id === "returnedDate") && value ? value : current.date;
      const nextForm: FormData = {
        ...current,
        fields,
        studentName: nextStudentName,
        school: nextSchool,
        agent: nextAgent,
        date: nextDate,
      };

      if (isRegistryTemplate) {
        nextForm.title = getRegistryDisplayTitle(
          {
            title: nextForm.title,
            studentName: nextForm.studentName,
            academicYear: nextForm.academicYear,
            year: fields.year || nextForm.academicYear,
            seatPrefix: fields.seatPrefix,
            seatNo: fields.seatNo,
            seatNumber: fields.seatNumber,
            certificateNo: fields.certificateNo,
            fields,
          },
          language,
        );
      }

      return nextForm;
    });
  }

  const registryFieldDefinitions = getRegistryFieldDefinitions();
  const isRegistryTemplate = (selectedTemplate?.id ?? form.templateId) === REGISTRY_TEMPLATE_ID;

  async function handleSave(status: "draft" | "active") {
    const effectiveTitle = isRegistryTemplate
      ? getRegistryDisplayTitle(
          {
            title: form.title,
            studentName: form.studentName,
            academicYear: form.academicYear,
            year: form.fields.year || form.academicYear,
            seatPrefix: form.fields.seatPrefix,
            seatNo: form.fields.seatNo,
            seatNumber: form.fields.seatNumber,
            certificateNo: form.fields.certificateNo,
            fields: form.fields,
          },
          language,
        )
      : form.title.trim();
    const effectiveStudentName = isRegistryTemplate ? form.fields.name?.trim() || form.studentName.trim() : form.studentName.trim();
    const effectiveDriveUrl = normalizeDriveFileUrl(form.driveFileUrl);
    const effectiveDriveFileId = extractDriveFileId(effectiveDriveUrl);

    if (!effectiveTitle) { Alert.alert(t("required"), t("documentTitle") + " " + t("fieldRequired")); return; }
    if (!effectiveStudentName) { Alert.alert(t("required"), t("studentName") + " " + t("fieldRequired")); return; }

    setSaving(true);
    try {
      const registryValues = form.fields;
      const registrySeatPrefix = registryValues.seatPrefix ?? "";
      const registryCertificateNo = registryValues.certificateNo ?? "";
      const registrySeatNo = [registrySeatPrefix, registryCertificateNo].filter(Boolean).join(" ").trim();
      const docData: Omit<Document, "id" | "createdAt" | "updatedAt"> = {
        title: effectiveTitle,
        studentName: effectiveStudentName,
        school: form.school.trim(),
        academicYear: form.academicYear,
        agent: form.agent.trim(),
        date: form.date,
        templateId: form.templateId,
        templateName: selectedTemplate?.name ?? "",
        serviceType: form.serviceType,
        fields: form.fields,
        notes: form.notes.trim(),
        ...(effectiveDriveUrl
          ? {
              driveFileUrl: effectiveDriveUrl,
              driveFileId: effectiveDriveFileId || undefined,
              driveSyncStatus: "synced",
              driveSyncedAt: new Date().toISOString(),
              driveSyncError: undefined,
            }
          : {}),
        status,
        driveSyncStatus: effectiveDriveUrl ? "synced" : "pending",
        createdBy: editingDocumentId ? existingDocument?.createdBy ?? user?.uid ?? "" : user?.uid ?? "",
        ...(isRegistryTemplate
          ? {
              index: registryValues.index || undefined,
              year: registryValues.year || undefined,
              seatPrefix: registrySeatPrefix || undefined,
              seatNo: registrySeatNo || undefined,
              seatNumber: registrySeatNo || undefined,
              certificateNo: registryCertificateNo || undefined,
              fatherName: registryValues.fatherName || undefined,
              township: registryValues.township || undefined,
              submittedBy: registryValues.submittedBy || undefined,
              submittedDate: registryValues.submittedDate || undefined,
              receivedDate: registryValues.receivedDate || undefined,
              returnedDate: registryValues.returnedDate || undefined,
              issuedBy: registryValues.issuedBy || undefined,
            }
          : {}),
      };
      let docId: string;
      if (editingDocumentId) {
        await updateDocument(editingDocumentId, docData);
        docId = editingDocumentId;
      } else {
        docId = await createDocument(docData);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!effectiveDriveUrl) {
        uploadDocumentToDrive({ ...docData, documentId: docId })
          .then((result) =>
            updateDocument(docId, {
              driveFileId: result.fileId,
              driveFileUrl: result.fileUrl,
              driveSyncStatus: "synced",
              driveSyncedAt: new Date().toISOString(),
              driveSyncError: undefined,
            })
          )
          .catch((error: any) =>
            updateDocument(docId, {
              driveSyncStatus: "failed",
              driveSyncError: error?.message ?? t("driveUploadFailed"),
            })
              .catch(() => {})
              .finally(() => {
                const driveError = classifyDriveUploadError(error);
                const message =
                  driveError.kind === "api-not-configured"
                    ? (language === "en"
                        ? "The backend API URL is not configured yet, so Drive status cannot be checked."
                        : "Backend API URL မသတ်မှတ်ရသေးပါ။ Google Drive status ကို စစ်မရသေးပါ။")
                    : driveError.kind === "missing-connector"
                    ? (language === "en"
                        ? "Google Drive is not connected yet. Ask an admin to link the Google account before uploading."
                        : "Google Drive connector မချိတ်ဆက်ရသေးပါ။ Admin ထံမှ Google account ချိတ်ရန် တောင်းဆိုပါ။")
                    : driveError.message || t("driveUploadFailed");
                Alert.alert(t("driveUploadFailed"), message);
              })
          );
      }

      router.replace({ pathname: "/document/[id]", params: { id: docId } });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to save document.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingTemplates || loadingDocument) {
    return (
      <View style={[styles.loadingWrap, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <RoleRouteGate minRole="editor">
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DriveStatusBanner />

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("serviceType")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
            {visibleServiceTypes.map((svc) => (
              <TouchableOpacity
                key={svc.id}
                onPress={() => setField("serviceType", svc.id)}
                style={[
                  styles.templateChip,
                  {
                    backgroundColor: form.serviceType === svc.id ? colors.accent : colors.muted,
                    borderColor: form.serviceType === svc.id ? colors.accent : colors.border,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.templateChipText, { color: form.serviceType === svc.id ? "#fff" : colors.foreground }]}>
                  {getServiceTypeLabelFromValue(language, svc.id, serviceTypes)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("template")}</Text>
          <View style={[styles.tipBox, { backgroundColor: colors.tealLight, borderColor: colors.border }]}>
            <Feather name="info" size={16} color={colors.accent} />
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>{t("chooseTemplateStructure")}</Text>
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                {t("keepFormAndTemplateAligned")}
              </Text>
            </View>
          </View>
          {loadingTemplates ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : matchingTemplates.length === 0 ? (
            <Text style={[styles.noTemplate, { color: colors.mutedForeground }]}>
              {selectedServiceTypeLabel ? `${selectedServiceTypeLabel} ${t("noTemplatesAvailable")}` : t("noTemplatesAvailable")}. {t("createFirstTemplate")}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
              {matchingTemplates.map((tmpl) => (
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
          {selectedTemplate && (
            <View style={[styles.templateSummary, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.templateSummaryTitle, { color: colors.foreground }]}>
                {selectedTemplate.name}
              </Text>
              <Text style={[styles.templateSummaryMeta, { color: colors.mutedForeground }]}>
                {getServiceTypeLabelFromValue(language, selectedTemplate.serviceType, serviceTypes)} • {selectedTemplate.fields.length} {t("customFields")}
              </Text>
              {selectedTemplate.description ? (
                <Text style={[styles.templateSummaryDesc, { color: colors.mutedForeground }]}>
                  {selectedTemplate.description}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {!isRegistryTemplate ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("basicInformation")}</Text>
          <FieldInput labelText={t("documentTitle")} value={form.title} onChangeText={(v: string) => setField("title", v)} required colors={colors} />
          <FieldInput labelText={t("studentName")} value={form.studentName} onChangeText={(v: string) => setField("studentName", v)} required colors={colors} />
          <FieldInput labelText={t("schoolInstitution")} value={form.school} onChangeText={(v: string) => setField("school", v)} colors={colors} />
          <FieldInput labelText={t("agentProcessedBy")} value={form.agent} onChangeText={(v: string) => setField("agent", v)} colors={colors} />
          <FieldInput labelText={t("date")} value={form.date} onChangeText={(v: string) => setField("date", v)} placeholder="YYYY-MM-DD" colors={colors} />

          <View style={fi.group}>
            <Text style={[fi.label, { color: colors.foreground }]}>{t("academicYear")}</Text>
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
        ) : (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("basicInformation")}</Text>
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              {t("registryInformation")} {t("editDocument")} — {t("clickFieldsToEdit")}
            </Text>
          </View>
        )}

        {isRegistryTemplate ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              {t("registrySummaryHint")}
            </Text>
            <RegistryFieldsTable
              title={t("registryInformation")}
              fields={registryFieldDefinitions}
              values={form.fields}
              onChange={syncRegistryField}
              editable
              language={language}
            />
          </View>
        ) : null}

        {editingDocumentId && existingDocument ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("tracking")}</Text>
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              {t("trackingSummaryHint")}
            </Text>
            <View style={[styles.tipBox, { backgroundColor: colors.tealLight, borderColor: colors.border }]}>
              <Feather name="clock" size={16} color={colors.accent} />
              <View style={styles.tipTextWrap}>
                <Text style={[styles.tipTitle, { color: colors.foreground }]}>{t("tracking")}</Text>
                <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{t("clickFieldsToEdit")}</Text>
              </View>
            </View>
            <View style={styles.trackingList}>
              <View style={[styles.trackingItem, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.trackingLabel, { color: colors.mutedForeground }]}>{t("created")}</Text>
                <Text style={[styles.trackingValue, { color: colors.foreground }]}>
                  {formatDate(existingDocument.createdAt, { day: "numeric", month: "long", year: "numeric" })}
                </Text>
              </View>
              <View style={[styles.trackingItem, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.trackingLabel, { color: colors.mutedForeground }]}>{t("lastUpdated")}</Text>
                <Text style={[styles.trackingValue, { color: colors.foreground }]}>
                  {existingDocument.updatedAt
                    ? formatDate(existingDocument.updatedAt, { day: "numeric", month: "long", year: "numeric" })
                    : formatDate(existingDocument.createdAt, { day: "numeric", month: "long", year: "numeric" })}
                </Text>
              </View>
              <View style={[styles.trackingItem, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.trackingLabel, { color: colors.mutedForeground }]}>{t("driveSync")}</Text>
                <Text style={[styles.trackingValue, { color: colors.foreground }]}>
                  {existingDocument.driveSyncStatus === "synced"
                    ? t("driveSynced")
                    : existingDocument.driveSyncStatus === "failed"
                    ? t("driveFailed")
                    : existingDocument.driveFileUrl
                    ? t("driveSynced")
                    : t("drivePending")}
                </Text>
              </View>
              <View style={[styles.trackingItem, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.trackingLabel, { color: colors.mutedForeground }]}>{t("currentStatus")}</Text>
                <Text style={[styles.trackingValue, { color: colors.foreground }]}>{translateStatus(existingDocument.status)}</Text>
              </View>
              {existingDocument.driveSyncError ? (
                <View style={[styles.trackingItem, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                  <Text style={[styles.trackingLabel, { color: colors.mutedForeground }]}>{t("lastDriveError")}</Text>
                  <Text style={[styles.trackingValue, { color: colors.foreground }]}>{existingDocument.driveSyncError}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("googleDriveLink")}</Text>
          <View style={[styles.tipBox, { backgroundColor: colors.tealLight, borderColor: colors.border }]}>
            <Feather name="link" size={16} color={colors.accent} />
            <View style={styles.tipTextWrap}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>{t("googleDriveLink")}</Text>
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                {t("driveLinkHint")}
              </Text>
            </View>
          </View>
          <FieldInput
            labelText={t("googleDriveLink")}
            value={form.driveFileUrl}
            onChangeText={(v: string) => setField("driveFileUrl", v)}
            placeholder="https://drive.google.com/open?id=..."
            colors={colors}
          />
        </View>

        {selectedTemplate && selectedTemplate.fields.length > 0 && !isRegistryTemplate && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {selectedTemplate.name} {t("fieldsCount")}
            </Text>
            {selectedTemplate.fields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={form.fields[field.id] ?? ""}
                onChangeText={(v: string) => setDynamicField(field.id, v)}
                labelText={localizeFieldLabel(language, field)}
                placeholder={localizePlaceholder(language, field, `Enter ${field.label.toLowerCase()}`)}
                multiline={field.type === "textarea"}
                required={field.required}
                hintText={FIELD_TYPE_HINTS[field.type]}
                colors={colors}
              />
            ))}
          </View>
        )}

        {!isRegistryTemplate ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{t("notes")}</Text>
            <FieldInput labelText={t("notes")} value={form.notes} onChangeText={(v: string) => setField("notes", v)} multiline colors={colors} />
          </View>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleSave("draft")}
            disabled={saving}
            style={[styles.draftBtn, { borderColor: colors.border }]}
            activeOpacity={0.8}
          >
            {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="save" size={18} color={colors.primary} />}
            <Text style={[styles.draftBtnText, { color: colors.primary }]}>{t("saveDraft")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSave("active")}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check" size={18} color="#fff" />}
            <Text style={styles.saveBtnText}>{t("saveAndActivate")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </RoleRouteGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  tipBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  tipTextWrap: { flex: 1, gap: 3 },
  tipTitle: { fontSize: 13, fontWeight: "700" },
  tipText: { fontSize: 12.5, lineHeight: 18 },
  templateSummary: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4, marginTop: 4 },
  templateSummaryTitle: { fontSize: 14, fontWeight: "700" },
  templateSummaryMeta: { fontSize: 12 },
  templateSummaryDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  noteText: { fontSize: 13, lineHeight: 18 },
  trackingList: { gap: 8 },
  trackingItem: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  trackingLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  trackingValue: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
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
