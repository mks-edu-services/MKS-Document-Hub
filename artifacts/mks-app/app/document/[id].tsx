import { Feather, MaterialIcons } from "@/components/AppIcons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Image,
  Pressable,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RoleGate } from "@/components/RoleGate";
import { RegistryCertificatePreview } from "@/components/RegistryCertificatePreview";
import { DriveStatusBanner } from "@/components/DriveStatusBanner";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import {
  getRegistryDisplayTitle,
  getRegistryFieldDefinitions,
  getRegistryDocumentFieldValue,
  isRegistryDocument,
} from "@/lib/registry";
import { deleteDocument, getDocument, updateDocument } from "@/lib/firestore";
import {
  buildDriveFullImageUrl,
  buildDriveDownloadUrl,
  buildDrivePreviewUrl,
  buildDriveThumbnailUrl,
  classifyDriveUploadError,
  extractDriveFileId,
  normalizeDriveFileUrl,
  searchDriveFiles,
  uploadDocumentToDrive,
  type DriveHealthState,
} from "@/lib/driveUpload";
import { Document, DocumentStatus } from "@/types";

const statusConfig: Record<
  DocumentStatus,
  { label: string; color: string; bg: string }
> = {
  active: { label: "Active", color: "#16a34a", bg: "#dcfce7" },
  draft: { label: "Draft", color: "#d97706", bg: "#fef3c7" },
  archived: { label: "Archived", color: "#6b7c93", bg: "#f0f4f8" },
};

function normalizeDocument(document: Document | null): Document | null {
  if (!document) return null;

  const status: DocumentStatus =
    document.status === "active" ||
    document.status === "draft" ||
    document.status === "archived"
      ? document.status
      : "draft";

  const fields =
    document.fields && typeof document.fields === "object" && !Array.isArray(document.fields)
      ? document.fields
      : {};
  const normalizedFields = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, value == null ? "" : String(value)]),
  ) as Record<string, string>;

  return {
    ...document,
    status,
    title: document.title ?? "",
    templateId: document.templateId ?? "",
    templateName: document.templateName ?? "",
    serviceType: document.serviceType ?? "",
    fields: normalizedFields,
    studentName: document.studentName ?? "",
    school: document.school ?? "",
    academicYear: document.academicYear ?? "",
    agent: document.agent ?? "",
    date: document.date ?? "",
    driveFileId: document.driveFileId ? String(document.driveFileId) : undefined,
    driveFileUrl: document.driveFileUrl ? String(document.driveFileUrl) : undefined,
    driveFileName: document.driveFileName ? String(document.driveFileName) : undefined,
    driveFolderLink: document.driveFolderLink ? String(document.driveFolderLink) : undefined,
    driveFolderPath: document.driveFolderPath ? String(document.driveFolderPath) : undefined,
    driveMatchMethod: document.driveMatchMethod ? String(document.driveMatchMethod) : undefined,
    driveMatchConfidence:
      typeof document.driveMatchConfidence === "number"
        ? document.driveMatchConfidence
        : document.driveMatchConfidence
          ? Number(document.driveMatchConfidence)
          : undefined,
    scanFileId: document.scanFileId ? String(document.scanFileId) : undefined,
    scanFileName: document.scanFileName ? String(document.scanFileName) : undefined,
    scanFileUrl: document.scanFileUrl ? String(document.scanFileUrl) : undefined,
    scanPreviewUrl: document.scanPreviewUrl ? String(document.scanPreviewUrl) : undefined,
    scanSearchKey: document.scanSearchKey ? String(document.scanSearchKey) : undefined,
    driveSyncStatus: document.driveSyncStatus,
    driveSyncError: document.driveSyncError ? String(document.driveSyncError) : undefined,
    driveSyncedAt: document.driveSyncedAt ? String(document.driveSyncedAt) : undefined,
    notes: document.notes ? String(document.notes) : undefined,
    sr: document.sr ? String(document.sr) : undefined,
    createdBy: document.createdBy ?? "",
    createdAt: document.createdAt ?? "",
    updatedAt: document.updatedAt ?? "",
  };
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={ir.row}>
      <Feather name={icon as any} size={14} color={colors.accent} />
      <View style={ir.content}>
        <Text style={[ir.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text style={[ir.value, { color: colors.foreground }]}>{value}</Text>
      </View>
    </View>
  );
}

const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 8,
  },
  content: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  value: { fontSize: 15, marginTop: 2, fontWeight: "500" },
});

export default function DocumentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user } = useAuth();
  const { language, t, formatDate, translateServiceType, translateStatus } =
    useLanguage();

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [scanQuery, setScanQuery] = useState("");
  const [scanSearching, setScanSearching] = useState(false);
  const [scanResults, setScanResults] = useState<
    { id: string; name: string; webViewLink?: string; thumbnailLink?: string }[]
  >([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImageSources, setPreviewImageSources] = useState<string[]>([]);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [previewImageSize, setPreviewImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [driveHealth, setDriveHealth] = useState<DriveHealthState | null>(null);
  const [driveLinkDraft, setDriveLinkDraft] = useState("");
  const [savingDriveLink, setSavingDriveLink] = useState(false);

  useEffect(() => {
    if (id) {
      getDocument(id)
        .then((doc) => {
          setDocument(normalizeDocument(doc));
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (!document) return;
    if (scanQuery.trim()) return;
    setScanQuery(
      document.scanSearchKey ||
        `${document.studentName} ${document.title}`.trim(),
    );
  }, [document]);

  useEffect(() => {
    setDriveLinkDraft(document?.driveFileUrl ?? "");
  }, [document?.driveFileUrl]);

  async function handleStatusChange(newStatus: DocumentStatus) {
    if (!document) return;
    setUpdating(true);
    try {
      await updateDocument(document.id, { status: newStatus });
      setDocument((d) => (d ? { ...d, status: newStatus } : d));
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
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              router.back();
            } catch (_) {
              Alert.alert("Error", "Failed to delete document.");
            }
          },
        },
      ],
    );
  }

  async function handleSearchScan() {
    if (!scanQuery.trim()) return;
    setScanSearching(true);
    try {
      const results = await searchDriveFiles(scanQuery.trim());
      setScanResults(results);
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to search Drive files.");
    } finally {
      setScanSearching(false);
    }
  }

  async function handleAttachScan(file: {
    id: string;
    name: string;
    webViewLink?: string;
    thumbnailLink?: string;
  }) {
    if (!document) return;
    const previewUrl =
      file.thumbnailLink ||
      file.webViewLink ||
      `https://drive.google.com/file/d/${file.id}/view`;
    await updateDocument(document.id, {
      scanFileId: file.id,
      scanFileName: file.name,
      scanFileUrl:
        file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      scanPreviewUrl: previewUrl,
    });
    setDocument((d) =>
      d
        ? {
            ...d,
            scanFileId: file.id,
            scanFileName: file.name,
            scanFileUrl:
              file.webViewLink ||
              `https://drive.google.com/file/d/${file.id}/view`,
            scanPreviewUrl: previewUrl,
          }
        : d,
    );
  }

  async function handleUploadToDrive() {
    if (!document) return;
    setUploadingToDrive(true);
    try {
      await updateDocument(document.id, {
        driveSyncStatus: "pending",
        driveSyncError: undefined,
      });
      setDocument((d) =>
        d ? { ...d, driveSyncStatus: "pending", driveSyncError: undefined } : d,
      );
      const result = await uploadDocumentToDrive({
        documentId: document.id,
        title: document.title,
        studentName: document.studentName,
        school: document.school,
        serviceType: document.serviceType,
        academicYear: document.academicYear,
        agent: document.agent,
        date: document.date,
        templateName: document.templateName,
        fields: document.fields,
        notes: document.notes,
      });
      await updateDocument(document.id, {
        driveFileId: result.fileId,
        driveFileUrl: result.fileUrl,
        driveSyncStatus: "synced",
        driveSyncedAt: new Date().toISOString(),
        driveSyncError: undefined,
      });
      setDocument((d) =>
        d
          ? {
              ...d,
              driveFileId: result.fileId,
              driveFileUrl: result.fileUrl,
              driveSyncStatus: "synced",
              driveSyncedAt: new Date().toISOString(),
              driveSyncError: undefined,
            }
          : d,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      const driveError = classifyDriveUploadError(e);
      const message =
        driveError.kind === "api-not-configured"
          ? language === "en"
            ? "The backend API URL is not configured yet, so Drive status cannot be checked."
            : "Backend API URL မသတ်မှတ်ရသေးပါ။ Google Drive status ကို စစ်မရသေးပါ။"
          : driveError.kind === "missing-connector"
            ? language === "en"
              ? "Google Drive is not connected yet. Ask an admin to link the Google account before uploading."
              : "Google Drive connector မချိတ်ဆက်ရသေးပါ။ Admin ထံမှ Google account ချိတ်ရန် တောင်းဆိုပါ။"
            : driveError.message || t("driveUploadFailed");
      await updateDocument(document.id, {
        driveSyncStatus: "failed",
        driveSyncError: message,
      }).catch(() => {});
      setDocument((d) =>
        d ? { ...d, driveSyncStatus: "failed", driveSyncError: message } : d,
      );
      Alert.alert(t("driveUploadFailed"), message);
    } finally {
      setUploadingToDrive(false);
    }
  }

  async function handleSaveDriveLink() {
    if (!document) return;
    const effectiveDriveUrl = normalizeDriveFileUrl(driveLinkDraft);
    const effectiveDriveFileId = extractDriveFileId(effectiveDriveUrl);
    setSavingDriveLink(true);
    try {
      await updateDocument(document.id, {
        driveFileUrl: effectiveDriveUrl || undefined,
        driveFileId: effectiveDriveFileId || undefined,
        driveSyncStatus: effectiveDriveUrl ? "synced" : "pending",
        driveSyncedAt: effectiveDriveUrl ? new Date().toISOString() : undefined,
        driveSyncError: undefined,
      });
      setDocument((d) =>
        d
          ? {
              ...d,
              driveFileUrl: effectiveDriveUrl || undefined,
              driveFileId: effectiveDriveFileId || undefined,
              driveSyncStatus: effectiveDriveUrl ? "synced" : "pending",
              driveSyncedAt: effectiveDriveUrl
                ? new Date().toISOString()
                : d.driveSyncedAt,
              driveSyncError: undefined,
            }
          : d,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("saveChanges"), t("accountUpdated"));
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? t("driveUploadFailed"));
    } finally {
      setSavingDriveLink(false);
    }
  }

  function openDriveFile() {
    if (document?.driveFileUrl) {
      Linking.openURL(document.driveFileUrl);
    }
  }

  const previewImageUrl = previewImageSources[previewImageIndex] ?? "";
  const previewPanelWidth = Math.max(Math.min(windowWidth - 64, 1040), 320);
  const previewPanelHeight = Math.max(Math.min(windowHeight * 0.78, 760), 320);

  useEffect(() => {
    if (!previewVisible || !previewImageUrl) return;
    let cancelled = false;
    Image.getSize(
      previewImageUrl,
      (width, height) => {
        if (cancelled) return;
        setPreviewImageSize({ width, height });
      },
      () => {
        if (cancelled) return;
        setPreviewImageSize(null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [previewImageUrl, previewVisible]);

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
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Document not found
        </Text>
      </View>
    );
  }

  const status = {
    ...(statusConfig[document.status] ?? statusConfig.draft),
    label: translateStatus(document.status),
  };
  const createdDate = formatDate(document.createdAt, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const updatedDate = document.updatedAt
    ? formatDate(document.updatedAt, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const registryTitle = getRegistryDisplayTitle(document, language);
  const driveSyncStatus =
    document.driveSyncStatus ?? (document.driveFileUrl ? "synced" : "pending");
  const driveSyncLabel =
    driveSyncStatus === "synced"
      ? t("driveSynced")
      : driveSyncStatus === "failed"
        ? t("driveFailed")
        : t("drivePending");
  const displaySubtitle = document.fatherName || document.studentName;
  const registryFields = getRegistryFieldDefinitions();
  const registryValues = Object.fromEntries(
    registryFields.map((field) => [
      field.id,
      getRegistryDocumentFieldValue(document, field.id),
    ]),
  );
  const showRegistryTable = isRegistryDocument(document);
  const preferDriveApiPreview = driveHealth?.apiConfigured === true;
  const preferredScanSource =
    document.scanPreviewUrl ||
    document.scanFileId ||
    document.scanFileUrl ||
    document.driveFileId ||
    document.driveFileUrl ||
    "";
  const scanThumbUrl =
    document.scanPreviewUrl ||
    (preferDriveApiPreview ? buildDrivePreviewUrl(preferredScanSource) : "") ||
    buildDriveThumbnailUrl(preferredScanSource) ||
    document.scanFileUrl ||
    document.driveFileUrl ||
    "";
  const scanFullUrl =
    buildDriveFullImageUrl(preferredScanSource) ||
    (preferDriveApiPreview ? buildDrivePreviewUrl(preferredScanSource) : "") ||
    buildDriveThumbnailUrl(preferredScanSource) ||
    document.scanFileUrl ||
    document.driveFileUrl ||
    scanThumbUrl;
  const scanDownloadUrl =
    buildDriveDownloadUrl(preferredScanSource) ||
    document.scanFileUrl ||
    document.driveFileUrl ||
    "";
  function handleOpenPreview() {
    if (!document) return;
    const currentDocument = document;
    const sources = Array.from(
      new Set(
        [
          scanThumbUrl,
          scanFullUrl,
          scanDownloadUrl,
          currentDocument.scanFileUrl,
          currentDocument.driveFileUrl,
        ].filter((value): value is string => !!value),
      ),
    );
    setPreviewImageSources(sources);
    setPreviewImageIndex(0);
    setPreviewImageSize(null);
    setPreviewVisible(true);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.primary }]}>
        <View style={styles.headerTop}>
          <View
            style={[
              styles.serviceTag,
              { backgroundColor: "rgba(255,255,255,0.15)" },
            ]}
          >
            <Text style={styles.serviceTagText}>
              {translateServiceType(document.serviceType)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
        <Text style={styles.docTitle}>{registryTitle}</Text>
        <Text style={styles.docStudent}>{displaySubtitle}</Text>
        <Text style={styles.docDate}>{`${t("created")} ${createdDate}`}</Text>
      </View>

      <RoleGate minRole="editor">
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/document/new",
              params: { id: document.id },
            })
          }
          style={[
            styles.editBtn,
            { backgroundColor: colors.navyLight, borderColor: colors.border },
          ]}
          activeOpacity={0.8}
        >
          <Feather name="edit-2" size={16} color={colors.primary} />
          <Text style={[styles.editBtnText, { color: colors.primary }]}>
            {t("editDocument")}
          </Text>
        </TouchableOpacity>
      </RoleGate>

      {showRegistryTable ? (
        <RegistryCertificatePreview
          title={`${registryTitle}`}
          fields={registryFields}
          values={registryValues}
          thumbnailUrl={scanThumbUrl}
          fullImageUrl={scanFullUrl}
          downloadUrl={scanDownloadUrl}
          onPressThumbnail={handleOpenPreview}
          language={language}
        />
      ) : null}

      <DriveStatusBanner onHealthChange={setDriveHealth} />

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.primary }]}>
          {t("googleDriveLink")}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={[styles.driveHint, { color: colors.mutedForeground }]}>
          {t("driveLinkHint")}
        </Text>
        <TextInput
          style={[
            styles.manualDriveInput,
            {
              borderColor: colors.border,
              backgroundColor: colors.muted,
              color: colors.foreground,
            },
          ]}
          placeholder="https://drive.google.com/open?id=..."
          placeholderTextColor={colors.mutedForeground}
          value={driveLinkDraft}
          onChangeText={setDriveLinkDraft}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <RoleGate minRole="editor">
          <TouchableOpacity
            onPress={handleSaveDriveLink}
            disabled={savingDriveLink}
            style={[
              styles.manualDriveSaveBtn,
              {
                backgroundColor: colors.primary,
                opacity: savingDriveLink ? 0.7 : 1,
              },
            ]}
            activeOpacity={0.85}
          >
            {savingDriveLink ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="save" size={16} color="#fff" />
            )}
            <Text style={styles.manualDriveSaveText}>{t("saveChanges")}</Text>
          </TouchableOpacity>
        </RoleGate>
      </View>

      {document.driveFileUrl ? (
        <TouchableOpacity
          onPress={openDriveFile}
          style={[
            styles.driveCard,
            { backgroundColor: "#e8f5e9", borderColor: "#4caf50" },
          ]}
          activeOpacity={0.8}
        >
          <View style={styles.driveRow}>
            <MaterialIcons name="insert-drive-file" size={22} color="#2e7d32" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.driveLabel, { color: "#2e7d32" }]}>
                {t("linkedGoogleDoc")}
              </Text>
              <Text
                style={[styles.driveUrl, { color: "#1b5e20" }]}
                numberOfLines={1}
              >
                {document.driveFileUrl}
              </Text>
            </View>
            <Feather name="external-link" size={16} color="#2e7d32" />
          </View>
        </TouchableOpacity>
      ) : (
        <View
          style={[
            styles.driveCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.driveRow}>
            <MaterialIcons name="cloud-off" size={22} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.driveLabel, { color: colors.foreground }]}>
                Google Drive
              </Text>
              <Text
                style={[styles.driveUrl, { color: colors.mutedForeground }]}
                numberOfLines={2}
              >
                {driveSyncLabel}
              </Text>
            </View>
          </View>
          <RoleGate minRole="editor">
            <TouchableOpacity
              onPress={handleUploadToDrive}
              disabled={
                uploadingToDrive ||
                driveHealth?.apiConfigured === false ||
                driveHealth?.configured === false
              }
              style={[
                styles.driveUploadBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  marginTop: 12,
                  opacity:
                    uploadingToDrive ||
                    driveHealth?.apiConfigured === false ||
                    driveHealth?.configured === false
                      ? 0.65
                      : 1,
                },
              ]}
              activeOpacity={0.8}
            >
              {uploadingToDrive ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons
                  name="cloud-upload"
                  size={18}
                  color={colors.primary}
                />
              )}
              <Text style={[styles.driveUploadText, { color: colors.primary }]}>
                {uploadingToDrive
                  ? `${t("uploadToDrive")}…`
                  : document.driveSyncStatus === "failed"
                    ? t("retryGoogleDriveSync")
                    : t("uploadToDrive")}
              </Text>
            </TouchableOpacity>
          </RoleGate>
        </View>
      )}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.primary }]}>
          {t("scanCertificate")}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        {!document.scanFileUrl && !document.driveFileUrl ? (
          <View style={styles.scanEmptyWrap}>
            <Text style={[styles.scanEmpty, { color: colors.mutedForeground }]}>
              {t("scanNotLinked")}
            </Text>
          </View>
        ) : null}

        <View style={styles.scanSearchBox}>
          <TextInput
            style={[
              styles.scanInput,
              {
                borderColor: colors.border,
                backgroundColor: colors.muted,
                color: colors.foreground,
              },
            ]}
            placeholder={t("scanSearchPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            value={scanQuery}
            onChangeText={setScanQuery}
          />
          <TouchableOpacity
            onPress={handleSearchScan}
            disabled={scanSearching}
            style={[styles.scanSearchBtn, { backgroundColor: colors.primary }]}
          >
            {scanSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.scanSearchBtnText}>{t("search")}</Text>
            )}
          </TouchableOpacity>
        </View>

        {scanResults.length > 0 ? (
          <View style={styles.scanResults}>
            <Text
              style={[styles.scanResultsTitle, { color: colors.foreground }]}
            >
              {t("searchResults")}
            </Text>
            {scanResults.map((file) => (
              <TouchableOpacity
                key={file.id}
                onPress={() => handleAttachScan(file)}
                style={[
                  styles.scanResultRow,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.scanResultName,
                      { color: colors.foreground },
                    ]}
                    numberOfLines={2}
                  >
                    {file.name}
                  </Text>
                  <Text
                    style={[
                      styles.scanResultMeta,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {file.webViewLink ?? file.id}
                  </Text>
                </View>
                <Text style={[styles.scanAttachText, { color: colors.accent }]}>
                  {t("attach")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.primary }]}>
          {t("documentDetails")}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow icon="book-open" label={t("school")} value={document.school} />
        <InfoRow
          icon="calendar"
          label={t("academicYear")}
          value={document.academicYear}
        />
        <InfoRow icon="user" label={t("agent")} value={document.agent} />
        <InfoRow icon="clock" label={t("date")} value={document.date} />
        {document.templateName && (
          <InfoRow
            icon="layout"
            label={t("templateName")}
            value={document.templateName}
          />
        )}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.primary }]}>
          {t("tracking")}
        </Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <InfoRow icon="clock" label={t("created")} value={createdDate} />
        <InfoRow
          icon="refresh-cw"
          label={t("lastUpdated")}
          value={updatedDate || createdDate}
        />
        <InfoRow icon="link" label={t("driveSync")} value={driveSyncLabel} />
        {document.driveSyncError ? (
          <InfoRow
            icon="alert-triangle"
            label={t("lastDriveError")}
            value={document.driveSyncError}
          />
        ) : null}
        <InfoRow
          icon="check-circle"
          label={t("currentStatus")}
          value={translateStatus(document.status)}
        />
      </View>

      {Object.keys(document.fields ?? {}).length > 0 && !showRegistryTable ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            {t("additionalFields")}
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {Object.entries(document.fields ?? {}).map(([key, value]) => (
            <View key={key} style={styles.fieldRow}>
              <Text
                style={[styles.fieldLabel, { color: colors.mutedForeground }]}
              >
                {key}
              </Text>
              <Text style={[styles.fieldValue, { color: colors.foreground }]}>
                {value ? value : "—"}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {document.notes ? (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.primary }]}>
            {t("notes")}
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.notes, { color: colors.foreground }]}>
            {document.notes}
          </Text>
        </View>
      ) : null}

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreviewVisible(false);
          setPreviewImageSources([]);
          setPreviewImageIndex(0);
          setPreviewImageSize(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setPreviewVisible(false);
              setPreviewImageSources([]);
              setPreviewImageIndex(0);
              setPreviewImageSize(null);
            }}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {t("preview")}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setPreviewVisible(false);
                  setPreviewImageSources([]);
                  setPreviewImageIndex(0);
                  setPreviewImageSize(null);
                }}
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.muted },
                ]}
              >
                <Feather name="x" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            {previewImageUrl ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator
                style={[
                  styles.modalScroll,
                  { maxWidth: previewPanelWidth, maxHeight: previewPanelHeight },
                ]}
                contentContainerStyle={styles.modalScrollContent}
              >
                <ScrollView
                  showsVerticalScrollIndicator
                  style={styles.modalScrollInner}
                  contentContainerStyle={styles.modalScrollInnerContent}
                >
                  <Image
                    source={{ uri: previewImageUrl }}
                    style={[
                      styles.modalImage,
                      {
                        width: previewImageSize
                          ? Math.max(previewImageSize.width, previewPanelWidth)
                          : previewPanelWidth,
                        height: previewImageSize
                          ? Math.max(previewImageSize.height, previewPanelHeight)
                          : previewPanelHeight,
                      },
                    ]}
                    resizeMode="contain"
                    onError={() => {
                      if (previewImageIndex + 1 < previewImageSources.length) {
                        setPreviewImageIndex((index) => index + 1);
                        setPreviewImageSize(null);
                        return;
                      }
                      setPreviewImageSources([]);
                      setPreviewImageIndex(0);
                      setPreviewImageSize(null);
                    }}
                  />
                </ScrollView>
              </ScrollView>
            ) : (
              <View style={styles.modalFallbackBox}>
                <Text
                  style={[
                    styles.modalFallback,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {language === "en"
                    ? "Preview unavailable. Open the Drive file or download it instead."
                    : "ကြိုကြည့်ရန်မရသေးပါ။ Drive ဖိုင်ဖွင့်ရန် သို့မဟုတ် ဒေါင်းလုပ်လုပ်ရန် သုံးပါ။"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <RoleGate minRole="editor">
        <View style={styles.actionsCard}>
          <Text
            style={[styles.actionsTitle, { color: colors.mutedForeground }]}
          >
            {t("changeStatus")}
          </Text>
          <View style={styles.statusBtns}>
            {(["active", "draft", "archived"] as DocumentStatus[]).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => handleStatusChange(s)}
                disabled={document.status === s || updating}
                style={[
                  styles.statusBtn,
                  {
                    backgroundColor:
                      document.status === s ? statusConfig[s].bg : colors.muted,
                    borderColor:
                      document.status === s
                        ? statusConfig[s].color
                        : colors.border,
                    opacity: document.status === s ? 1 : 0.8,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    {
                      color:
                        document.status === s
                          ? statusConfig[s].color
                          : colors.mutedForeground,
                    },
                  ]}
                >
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
              <Text
                style={[styles.deleteBtnText, { color: colors.destructive }]}
              >
                {t("deleteDocument")}
              </Text>
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
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  serviceTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  serviceTagText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "700" },
  docTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 28 },
  docStudent: { color: "rgba(255,255,255,0.8)", fontSize: 15 },
  docDate: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  editBtnText: { fontSize: 14, fontWeight: "700" },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  divider: { height: 1, marginVertical: 10 },
  fieldRow: { paddingVertical: 8, gap: 2 },
  fieldLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  fieldValue: { fontSize: 15, fontWeight: "500" },
  notes: { fontSize: 14, lineHeight: 22 },
  driveCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  driveRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  driveLabel: { fontSize: 13, fontWeight: "700" },
  driveUrl: { fontSize: 11, marginTop: 2 },
  driveHint: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
  manualDriveInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  manualDriveSaveBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
  },
  manualDriveSaveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  driveUploadBtn: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  driveUploadText: { fontSize: 14, fontWeight: "700" },
  scanPreviewWrap: { gap: 8 },
  scanPreviewLabel: { fontSize: 12, fontWeight: "700" },
  scanPreviewBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  scanPreviewImage: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  scanPreviewName: { fontSize: 14, fontWeight: "700" },
  scanPreviewUrl: { fontSize: 11 },
  scanEmpty: { fontSize: 13 },
  scanEmptyWrap: { gap: 10 },
  scanActionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  scanActionBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanActionBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  scanSearchBox: { flexDirection: "row", gap: 8, marginTop: 12 },
  scanInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  scanSearchBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  scanSearchBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  scanResults: { marginTop: 12, gap: 8 },
  scanResultsTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  scanResultRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  scanResultName: { fontSize: 13, fontWeight: "700" },
  scanResultMeta: { fontSize: 11, marginTop: 2 },
  scanAttachText: { fontSize: 13, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 760,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollInner: {
    flexGrow: 1,
  },
  modalScrollInnerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  modalFallbackBox: {
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 24,
  },
  modalFallback: { fontSize: 14, textAlign: "center", paddingVertical: 40 },
  actionsCard: { gap: 12 },
  actionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBtns: { flexDirection: "row", gap: 8 },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
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
