import type { Document } from "@/types";
import { extractDriveFileId, normalizeDriveFileUrl } from "./driveUpload";

export type DriveWorkbookColumn = {
  key: string;
  header: string;
  label: string;
  width: number;
};

export type DriveWorkbookGuideRow = [string, string, string, string];

export type DriveWorkbookRow = Record<string, string>;

export const DRIVE_WORKBOOK_COLUMNS: DriveWorkbookColumn[] = [
  { key: "row_status", header: "row_status", label: "Status", width: 18 },
  { key: "doc_type", header: "doc_type", label: "Document Type", width: 18 },
  { key: "academic_year", header: "academic_year", label: "Academic Year", width: 16 },
  { key: "local_root_path", header: "local_root_path", label: "Local Root Path", width: 30 },
  { key: "year_folder_name", header: "year_folder_name", label: "Year Folder", width: 22 },
  { key: "month_folder_name", header: "month_folder_name", label: "Month Folder", width: 18 },
  { key: "day_or_group_folder_name", header: "day_or_group_folder_name", label: "Day / Group Folder", width: 24 },
  { key: "local_file_name", header: "local_file_name", label: "Local File Name", width: 26 },
  { key: "local_full_path", header: "local_full_path", label: "Local Full Path", width: 44 },
  { key: "seat_no", header: "seat_no", label: "Seat No", width: 16 },
  { key: "student_name", header: "student_name", label: "Student Name", width: 22 },
  { key: "file_alias", header: "file_alias", label: "File Alias", width: 24 },
  { key: "drive_link", header: "drive_link", label: "Drive Link", width: 42 },
  { key: "drive_file_id", header: "drive_file_id", label: "Drive File ID", width: 28 },
  { key: "drive_file_name", header: "drive_file_name", label: "Drive File Name", width: 28 },
  { key: "drive_folder_link", header: "drive_folder_link", label: "Drive Folder Link", width: 42 },
  { key: "drive_folder_path", header: "drive_folder_path", label: "Drive Folder Path", width: 34 },
  { key: "app_document_id", header: "app_document_id", label: "App Document ID", width: 24 },
  { key: "match_method", header: "match_method", label: "Match Method", width: 22 },
  { key: "match_confidence", header: "match_confidence", label: "Match Confidence", width: 18 },
  { key: "notes", header: "notes", label: "Notes", width: 28 },
];

export const DRIVE_ROW_STATUS_OPTIONS = ["matched", "pending", "review", "duplicate", "missing_drive_link"];
export const DRIVE_DOC_TYPE_OPTIONS = ["certificate", "degree", "transcript", "translation", "notary", "other"];

export const DRIVE_WORKBOOK_GUIDE_ROWS: DriveWorkbookGuideRow[] = [
  ["row_status", "Row အခြေအနေ", "matched / pending / review", "Template ထဲမှာ dropdown သုံးပါ"],
  ["doc_type", "ဖိုင်အမျိုးအစား", "certificate / degree / transcript", "Document type ခွဲရန်"],
  ["academic_year", "ပညာသင်နှစ်", "2025 / 2025-2026", "Year folder နဲ့ စစ်ဆေးရန်"],
  ["local_root_path", "Local root folder path", "D:\\MKS\\အောင်လက်မှတ် စုစုပေါင်း", "Folder hierarchy ရဲ့ စတင် path"],
  ["year_folder_name", "Year folder name", "အောင်လက်မှတ် 2025", "Folder segment အမည်"],
  ["month_folder_name", "Month folder name", "08-2025", "Folder segment အမည်"],
  ["day_or_group_folder_name", "Day / group folder", "26082025", "နေ့စွဲ သို့မဟုတ် group folder"],
  ["local_file_name", "File name", "စဟမ ၁၁ မနီနီအောင်.pdf", "final file name"],
  ["local_full_path", "Full local path", "D:\\MKS\\အောင်လက်မှတ် စုစုပေါင်း\\အောင်လက်မှတ် 2025\\08-2025\\26082025\\စဟမ ၁၁ မနီနီအောင်.pdf", "ရည်ညွှန်းချက်"],
  ["seat_no", "Seat number", "စဟမ ၁၁", "matching key"],
  ["student_name", "Student name", "မနီနီအောင်", "matching key"],
  ["file_alias", "Short search name", "စဟမ ၁၁ - မနီနီအောင်", "search convenience"],
  ["drive_link", "Google Drive share link", "https://drive.google.com/open?id=...", "paste copied link"],
  ["drive_file_id", "Drive file ID", "1tBsHPU28gYbd5BvBDSH5IW0uHM9m2Z-e", "optional; parsed automatically"],
  ["drive_file_name", "Drive file name", "စဟမ ၁၁ မနီနီအောင်", "optional"],
  ["drive_folder_link", "Drive folder link", "https://drive.google.com/drive/folders/...", "optional"],
  ["drive_folder_path", "Drive folder path", "2025 > 08-2025 > 26082025", "optional"],
  ["app_document_id", "MKS app document id", "firestore-doc-id", "best exact match key"],
  ["match_method", "How matched", "app_document_id / seat_no+student_name", "import note"],
  ["match_confidence", "Confidence 0-100", "100", "optional"],
  ["notes", "Notes", "extra remarks", "optional"],
];

export function normalizeDriveText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export function normalizeDriveKey(value: unknown): string {
  return normalizeDriveText(value).replace(/\s+/g, " ").toLowerCase();
}

export function parseDriveConfidence(value: unknown): number | null {
  const text = normalizeDriveText(value);
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function buildDriveDocumentKey(doc: Partial<Document> | Record<string, unknown>): string {
  const seat = normalizeDriveKey((doc as any).seatNo || (doc as any).seat_no || (doc as any).seatNumber || "");
  const name = normalizeDriveKey((doc as any).studentName || (doc as any).student_name || "");
  const year = normalizeDriveKey((doc as any).academicYear || (doc as any).academic_year || "");
  if (seat && name && year) return `${seat}|${name}|${year}`;
  if (seat && name) return `${seat}|${name}`;
  return "";
}

export function buildDriveWorkbookRowFromDocument(doc: Document): DriveWorkbookRow {
  const yearFolderName = doc.academicYear ? `အောင်လက်မှတ် ${doc.academicYear}` : "";
  return {
    row_status: doc.driveFileUrl ? "matched" : "pending",
    doc_type: String(doc.serviceType ?? "").trim(),
    academic_year: String(doc.academicYear ?? "").trim(),
    local_root_path: "",
    year_folder_name: yearFolderName,
    month_folder_name: "",
    day_or_group_folder_name: "",
    local_file_name: String(doc.driveFileName ?? doc.title ?? "").trim(),
    local_full_path: "",
    seat_no: String((doc as any).seatNo ?? (doc as any).seat_no ?? (doc as any).seatNumber ?? "").trim(),
    student_name: String(doc.studentName ?? "").trim(),
    file_alias: String(doc.title ?? doc.studentName ?? "").trim(),
    drive_link: normalizeDriveFileUrl(doc.driveFileUrl ?? ""),
    drive_file_id: String(doc.driveFileId ?? "").trim(),
    drive_file_name: String(doc.driveFileName ?? "").trim(),
    drive_folder_link: String(doc.driveFolderLink ?? "").trim(),
    drive_folder_path: String(doc.driveFolderPath ?? "").trim(),
    app_document_id: String(doc.id ?? "").trim(),
    match_method: String(doc.driveMatchMethod ?? "").trim(),
    match_confidence: doc.driveMatchConfidence === undefined || doc.driveMatchConfidence === null ? "" : String(doc.driveMatchConfidence),
    notes: String(doc.notes ?? "").trim(),
  };
}

export function buildDriveWorkbookRowFromImport(values: DriveWorkbookRow): DriveWorkbookRow {
  const driveLink = normalizeDriveFileUrl(values.drive_link);
  const driveFileId = normalizeDriveText(values.drive_file_id) || extractDriveFileId(driveLink);
  return {
    ...values,
    drive_link: driveLink || (driveFileId ? `https://drive.google.com/open?id=${driveFileId}` : ""),
    drive_file_id: driveFileId,
  };
}

