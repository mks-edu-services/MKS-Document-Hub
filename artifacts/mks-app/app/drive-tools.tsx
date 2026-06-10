import { Feather } from "@/components/AppIcons";
import { RoleRouteGate } from "@/components/RoleRouteGate";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { getDocuments, updateDocument } from "@/lib/firestore";
import {
  buildDriveDocumentKey,
  buildDriveWorkbookRowFromDocument,
  buildDriveWorkbookRowFromImport,
  DRIVE_WORKBOOK_COLUMNS,
  DRIVE_WORKBOOK_GUIDE_ROWS,
  normalizeDriveKey,
  normalizeDriveText,
  parseDriveConfidence,
} from "@/lib/driveExcel";
import { extractDriveFileId, normalizeDriveFileUrl } from "@/lib/driveUpload";
import { Document } from "@/types";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as XLSX from "xlsx";

type ImportSummary = {
  matched: number;
  updated: number;
  skipped: number;
  ambiguous: number;
  unmatched: number;
};

function createWorkbook(rows: Record<string, string>[], includeGuide = true) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(worksheet, [["Google Drive File Mapping Template"]], { origin: "A1" });
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [["Row တစ်ကြောင်း = ဖိုင်တစ်ဖိုင်။ Google Drive မှာ Copy link to clipboard နဲ့ယူထားတဲ့ link ကို drive_link column ထဲထည့်ပါ။"]],
    { origin: "A2" },
  );
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [["Folder pattern: local_root_path > year_folder_name > month_folder_name > day_or_group_folder_name > local_file_name"]],
    { origin: "A3" },
  );
  XLSX.utils.sheet_add_aoa(worksheet, [DRIVE_WORKBOOK_COLUMNS.map((column) => column.header)], { origin: "A4" });

  const dataStartRow = 5;
  const headers = DRIVE_WORKBOOK_COLUMNS.map((column) => column.header);
  rows.forEach((row, index) => {
    const values = headers.map((header) => row[header] ?? "");
    XLSX.utils.sheet_add_aoa(worksheet, [values], { origin: { r: dataStartRow - 1 + index, c: 0 } });
  });

  worksheet["!cols"] = DRIVE_WORKBOOK_COLUMNS.map((column) => ({ wch: Math.min(Math.max(column.width, 12), 52) }));
  worksheet["!autofilter"] = { ref: `A4:${XLSX.utils.encode_col(DRIVE_WORKBOOK_COLUMNS.length - 1)}2000` };

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["Field", "What to enter", "Example", "Import note"],
    ...DRIVE_WORKBOOK_GUIDE_ROWS,
  ]);
  guideSheet["!cols"] = [{ wch: 24 }, { wch: 24 }, { wch: 34 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Drive_Mapping");
  if (includeGuide) {
    XLSX.utils.book_append_sheet(workbook, guideSheet, "Column_Guide");
  }
  return workbook;
}

function downloadWorkbook(workbook: XLSX.WorkBook, fileName: string) {
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function readWorkbookRows(file: File): Promise<DriveWorkbookRow[]> {
  return file.arrayBuffer().then((buffer) => {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames.includes("Drive_Mapping") ? "Drive_Mapping" : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
    const headerRowIndex = rows.findIndex((row) => {
      const values = row.map((cell) => normalizeDriveText(cell).toLowerCase());
      return values.includes("row_status") && values.includes("drive_link");
    });
    const resolvedHeaderIndex = headerRowIndex >= 0 ? headerRowIndex : 3;
    const headers = (rows[resolvedHeaderIndex] ?? []).map((cell) => normalizeDriveText(cell));
    return rows.slice(resolvedHeaderIndex + 1).reduce<DriveWorkbookRow[]>((result, row) => {
      if (!row.some((cell) => normalizeDriveText(cell))) return result;
      const entry: DriveWorkbookRow = {};
      headers.forEach((header, index) => {
        if (header) {
          entry[header] = normalizeDriveText(row[index]);
        }
      });
      result.push(entry);
      return result;
    }, []);
  });
}

type DriveWorkbookRow = Record<string, string>;

function buildRowsFromDocuments(documents: Document[]) {
  return documents.map((doc) => buildDriveWorkbookRowFromDocument(doc));
}

export default function DriveToolsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [working, setWorking] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const isWeb = Platform.OS === "web";
  const guideRows = useMemo(
    () => DRIVE_WORKBOOK_GUIDE_ROWS.map((row) => ({ field: row[0], description: row[1], example: row[2], note: row[3] })),
    [],
  );

  async function handleDownloadTemplate() {
    if (!isWeb) {
      Alert.alert(t("error"), "Excel download is supported on web/desktop only for now.");
      return;
    }
    const workbook = createWorkbook([], true);
    downloadWorkbook(workbook, "Google_Drive_File_Mapping_Template.xlsx");
  }

  async function handleExportCurrentDocuments() {
    setWorking(true);
    try {
      const documents = await getDocuments();
      const workbook = createWorkbook(buildRowsFromDocuments(documents), true);
      if (isWeb) {
        downloadWorkbook(workbook, `Google_Drive_File_Mapping_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      } else {
        Alert.alert(t("error"), "Excel export is supported on web/desktop only for now.");
      }
    } catch (error: any) {
      Alert.alert(t("error"), error?.message ?? "Failed to export workbook.");
    } finally {
      setWorking(false);
    }
  }

  function openImportPicker() {
    if (!isWeb) {
      Alert.alert(t("error"), "Excel import is supported on web/desktop only for now.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setWorking(true);
      try {
        const rows = await readWorkbookRows(file);
        const documents = await getDocuments();
        const docsById = new Map(documents.map((doc) => [normalizeDriveKey(doc.id), doc]));
        const docsByKey = new Map<string, Document[]>();
        for (const doc of documents) {
          const key = buildDriveDocumentKey(doc);
          if (!key) continue;
          const existing = docsByKey.get(key) ?? [];
          existing.push(doc);
          docsByKey.set(key, existing);
        }

        let updated = 0;
        let skipped = 0;
        let ambiguous = 0;
        let unmatched = 0;

        for (const row of rows.map(buildDriveWorkbookRowFromImport)) {
          const driveLink = normalizeDriveFileUrl(row.drive_link);
          const driveFileId = normalizeDriveText(row.drive_file_id) || extractDriveFileId(driveLink);
          const driveFileName = normalizeDriveText(row.drive_file_name);
          const driveFolderLink = normalizeDriveText(row.drive_folder_link);
          const driveFolderPath = normalizeDriveText(row.drive_folder_path);
          const confidence = parseDriveConfidence(row.match_confidence);
          const appDocumentId = normalizeDriveKey(row.app_document_id);

          let match: Document | null = null;
          let matchMethod = normalizeDriveText(row.match_method) || "manual";

          if (appDocumentId && docsById.has(appDocumentId)) {
            match = docsById.get(appDocumentId) ?? null;
            matchMethod = "app_document_id";
          } else {
            const key = buildDriveDocumentKey({
              seatNo: row.seat_no,
              studentName: row.student_name,
              academicYear: row.academic_year,
            });
            const candidates = docsByKey.get(key) ?? [];
            if (candidates.length === 1) {
              match = candidates[0];
              matchMethod = "seat_no+student_name+academic_year";
            } else if (candidates.length > 1) {
              ambiguous += 1;
              continue;
            }
          }

          if (!match) {
            unmatched += 1;
            continue;
          }
          if (!driveLink && !driveFileId) {
            skipped += 1;
            continue;
          }

          await updateDocument(match.id, {
            driveFileUrl: driveLink || undefined,
            driveFileId: driveFileId || undefined,
            driveFileName: driveFileName || undefined,
            driveFolderLink: driveFolderLink || undefined,
            driveFolderPath: driveFolderPath || undefined,
            driveMatchMethod: matchMethod,
            driveMatchConfidence: confidence ?? undefined,
            driveSyncStatus: "synced",
            driveSyncedAt: new Date().toISOString(),
            driveSyncError: undefined,
          });
          updated += 1;
        }

        const result: ImportSummary = { matched: updated + skipped, updated, skipped, ambiguous, unmatched };
        setSummary(result);
        Alert.alert(
          t("driveTools"),
          `${t("driveImportDone")}\n${t("updated")}: ${updated}\n${t("skipped")}: ${skipped}\n${t("unmatched")}: ${unmatched}\n${t("ambiguous")}: ${ambiguous}`,
        );
      } catch (error: any) {
        Alert.alert(t("error"), error?.message ?? "Failed to import workbook.");
      } finally {
        setWorking(false);
      }
    };
    input.click();
  }

  return (
    <RoleRouteGate minRole="editor">
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerTop}>
            <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={styles.badgeText}>{t("driveTools")}</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Feather name="x" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>{t("driveExcelMenu")}</Text>
          <Text style={styles.subtitle}>{t("driveExcelHelp")}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("driveExcelGuide")}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.guideList}>
            {guideRows.map((row) => (
              <View key={row.field} style={[styles.guideRow, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.guideField, { color: colors.primary }]}>{row.field}</Text>
                <Text style={[styles.guideText, { color: colors.foreground }]}>{row.description}</Text>
                <Text style={[styles.guideExample, { color: colors.mutedForeground }]}>{row.example}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("driveTools")}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            onPress={() => void handleDownloadTemplate()}
            disabled={working}
            style={[styles.actionBtn, { backgroundColor: colors.navyLight, borderColor: colors.border, opacity: working ? 0.7 : 1 }]}
          >
            <Feather name="download" size={18} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t("downloadDriveTemplate")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void handleExportCurrentDocuments()}
            disabled={working}
            style={[styles.actionBtn, { backgroundColor: colors.tealLight, borderColor: colors.border, opacity: working ? 0.7 : 1 }]}
          >
            {working ? <ActivityIndicator size="small" color={colors.accent} /> : <Feather name="file-text" size={18} color={colors.accent} />}
            <Text style={[styles.actionText, { color: colors.accent }]}>{t("exportDriveWorkbook")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openImportPicker}
            disabled={working}
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.border, opacity: working ? 0.7 : 1 }]}
          >
            <Feather name="upload" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: "#fff" }]}>{t("importDriveWorkbook")}</Text>
          </TouchableOpacity>

          <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
            {t("driveImportHint")}
          </Text>
        </View>

        {summary ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t("driveImportSummary")}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.summaryText, { color: colors.foreground }]}>
              {`${t("updated")}: ${summary.updated} • ${t("skipped")}: ${summary.skipped} • ${t("unmatched")}: ${summary.unmatched} • ${t("ambiguous")}: ${summary.ambiguous}`}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </RoleRouteGate>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14 },
  header: { borderRadius: 18, padding: 18, gap: 12 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  badgeText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  title: { color: "#fff", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: "800" },
  divider: { height: 1, marginVertical: 12 },
  guideList: { gap: 8 },
  guideRow: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  guideField: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  guideText: { fontSize: 14, fontWeight: "600" },
  guideExample: { fontSize: 12, lineHeight: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 10 },
  actionText: { fontSize: 15, fontWeight: "700" },
  helperText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  summaryText: { fontSize: 14, lineHeight: 20 },
});
