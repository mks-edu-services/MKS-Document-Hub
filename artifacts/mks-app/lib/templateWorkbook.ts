import * as XLSX from "xlsx";
import type { Document, Template, TemplateField } from "@/types";
import { extractDriveFileId, normalizeDriveFileUrl } from "./driveUpload";

export type TemplateWorkbookRow = Record<string, string>;
export type TemplateWorkbookImportMode = "replace" | "append";

export type TemplateWorkbookImportDecision = {
  action: "create" | "update" | "skip";
  documentId?: string;
  payload: Partial<Document>;
  reason?: string;
  row: TemplateWorkbookRow;
};

export type TemplateWorkbookImportSummary = {
  total: number;
  matched: number;
  updated: number;
  created: number;
  skipped: number;
  ambiguous: number;
};

type WorkbookColumn = {
  key: string;
  header: string;
  label: string;
  width: number;
  kind: "base" | "custom";
  fieldId?: string;
};

const BASE_COLUMNS: WorkbookColumn[] = [
  { key: "row_status", header: "row_status", label: "Row Status", width: 18, kind: "base" },
  { key: "template_id", header: "template_id", label: "Template ID", width: 24, kind: "base" },
  { key: "template_name", header: "template_name", label: "Template Name", width: 28, kind: "base" },
  { key: "app_document_id", header: "app_document_id", label: "App Document ID", width: 24, kind: "base" },
  { key: "title", header: "title", label: "Title", width: 34, kind: "base" },
  { key: "service_type", header: "service_type", label: "Service Type", width: 20, kind: "base" },
  { key: "status", header: "status", label: "Status", width: 14, kind: "base" },
  { key: "index", header: "index", label: "Index", width: 14, kind: "base" },
  { key: "seat_prefix", header: "seat_prefix", label: "Seat Prefix", width: 18, kind: "base" },
  { key: "certificate_no", header: "certificate_no", label: "Certificate No.", width: 18, kind: "base" },
  { key: "seat_no", header: "seat_no", label: "Seat No", width: 20, kind: "base" },
  { key: "year", header: "year", label: "Year", width: 12, kind: "base" },
  { key: "student_name", header: "student_name", label: "Student Name", width: 24, kind: "base" },
  { key: "father_name", header: "father_name", label: "Father Name", width: 24, kind: "base" },
  { key: "township", header: "township", label: "Township", width: 20, kind: "base" },
  { key: "submitted_by", header: "submitted_by", label: "Submitted By", width: 20, kind: "base" },
  { key: "submitted_date", header: "submitted_date", label: "Submitted Date", width: 18, kind: "base" },
  { key: "received_date", header: "received_date", label: "Received Date", width: 18, kind: "base" },
  { key: "returned_date", header: "returned_date", label: "Returned Date", width: 18, kind: "base" },
  { key: "issued_by", header: "issued_by", label: "Issued By", width: 20, kind: "base" },
  { key: "school", header: "school", label: "School", width: 20, kind: "base" },
  { key: "academic_year", header: "academic_year", label: "Academic Year", width: 18, kind: "base" },
  { key: "agent", header: "agent", label: "Agent", width: 20, kind: "base" },
  { key: "date", header: "date", label: "Date", width: 18, kind: "base" },
  { key: "drive_link", header: "drive_link", label: "Google Drive Link", width: 42, kind: "base" },
  { key: "drive_file_id", header: "drive_file_id", label: "Drive File ID", width: 28, kind: "base" },
  { key: "drive_file_name", header: "drive_file_name", label: "Drive File Name", width: 28, kind: "base" },
  { key: "drive_folder_link", header: "drive_folder_link", label: "Drive Folder Link", width: 40, kind: "base" },
  { key: "drive_folder_path", header: "drive_folder_path", label: "Drive Folder Path", width: 36, kind: "base" },
  { key: "match_method", header: "match_method", label: "Match Method", width: 22, kind: "base" },
  { key: "match_confidence", header: "match_confidence", label: "Match Confidence", width: 18, kind: "base" },
  { key: "notes", header: "notes", label: "Notes", width: 30, kind: "base" },
];

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalizeKey(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, " ").toLowerCase();
}

function getFieldLabel(field: TemplateField): string {
  return field.labelMy || field.labelEn || field.label || field.id;
}

function getColumnValueKeys(column: WorkbookColumn): string[] {
  if (column.kind === "custom" && column.fieldId) {
    return [column.fieldId, `custom_${column.fieldId}`, column.header];
  }
  return [column.key, column.header];
}

function readRowValue(row: Record<string, unknown>, column: WorkbookColumn): string {
  for (const key of getColumnValueKeys(column)) {
    const value = normalizeText(row[key]);
    if (value) return value;
  }
  return "";
}

function hasWorkbookRowContent(template: Template, row: Record<string, unknown>): boolean {
  return getTemplateWorkbookColumns(template).some((column) => {
    if (column.key === "row_status") return false;
    return readRowValue(row, column).length > 0;
  });
}

function buildCustomColumns(template: Template): WorkbookColumn[] {
  return template.fields.map((field) => {
    const label = getFieldLabel(field);
    return {
      key: `custom_${field.id}`,
      header: label,
      label,
      width: Math.min(Math.max(label.length + 4, 18), 34),
      kind: "custom",
      fieldId: field.id,
    };
  });
}

export function getTemplateWorkbookColumns(template: Template): WorkbookColumn[] {
  return [...BASE_COLUMNS, ...buildCustomColumns(template)];
}

export function buildTemplateWorkbookRow(doc: Document, template: Template): TemplateWorkbookRow {
  const columns = getTemplateWorkbookColumns(template);
  const row: TemplateWorkbookRow = {};
  const customFields = doc.fields ?? {};

  for (const column of columns) {
    if (column.kind === "custom" && column.fieldId) {
      row[column.key] = normalizeText(customFields[column.fieldId]);
      continue;
    }

    switch (column.key) {
      case "row_status":
        row[column.key] = doc.driveFileUrl ? "matched" : "pending";
        break;
      case "template_id":
        row[column.key] = normalizeText(doc.templateId);
        break;
      case "template_name":
        row[column.key] = normalizeText(doc.templateName);
        break;
      case "app_document_id":
        row[column.key] = normalizeText(doc.id);
        break;
      case "title":
        row[column.key] = normalizeText(doc.title);
        break;
      case "service_type":
        row[column.key] = normalizeText(doc.serviceType);
        break;
      case "status":
        row[column.key] = normalizeText(doc.status);
        break;
      case "index":
        row[column.key] = normalizeText(doc.index);
        break;
      case "seat_prefix":
        row[column.key] = normalizeText(doc.seatPrefix);
        break;
      case "certificate_no":
        row[column.key] = normalizeText(doc.certificateNo);
        break;
      case "seat_no":
        row[column.key] = normalizeText(doc.seatNo ?? doc.seatNumber);
        break;
      case "year":
        row[column.key] = normalizeText(doc.year ?? doc.academicYear);
        break;
      case "student_name":
        row[column.key] = normalizeText(doc.studentName);
        break;
      case "father_name":
        row[column.key] = normalizeText(doc.fatherName);
        break;
      case "township":
        row[column.key] = normalizeText(doc.township);
        break;
      case "submitted_by":
        row[column.key] = normalizeText(doc.submittedBy);
        break;
      case "submitted_date":
        row[column.key] = normalizeText(doc.submittedDate);
        break;
      case "received_date":
        row[column.key] = normalizeText(doc.receivedDate);
        break;
      case "returned_date":
        row[column.key] = normalizeText(doc.returnedDate);
        break;
      case "issued_by":
        row[column.key] = normalizeText(doc.issuedBy);
        break;
      case "school":
        row[column.key] = normalizeText(doc.school);
        break;
      case "academic_year":
        row[column.key] = normalizeText(doc.academicYear);
        break;
      case "agent":
        row[column.key] = normalizeText(doc.agent);
        break;
      case "date":
        row[column.key] = normalizeText(doc.date);
        break;
      case "drive_link":
        row[column.key] = normalizeDriveFileUrl(doc.driveFileUrl ?? "");
        break;
      case "drive_file_id":
        row[column.key] = normalizeText(doc.driveFileId ?? extractDriveFileId(doc.driveFileUrl ?? ""));
        break;
      case "drive_file_name":
        row[column.key] = normalizeText(doc.driveFileName);
        break;
      case "drive_folder_link":
        row[column.key] = normalizeText(doc.driveFolderLink);
        break;
      case "drive_folder_path":
        row[column.key] = normalizeText(doc.driveFolderPath);
        break;
      case "match_method":
        row[column.key] = normalizeText(doc.driveMatchMethod);
        break;
      case "match_confidence":
        row[column.key] = normalizeText(doc.driveMatchConfidence);
        break;
      case "notes":
        row[column.key] = normalizeText(doc.notes);
        break;
      default:
        row[column.key] = "";
        break;
    }
  }

  return row;
}

export function buildTemplateWorkbookRows(template: Template, documents: Document[]): TemplateWorkbookRow[] {
  return documents.map((doc) => buildTemplateWorkbookRow(doc, template));
}

export function createTemplateWorkbook(template: Template, rows: TemplateWorkbookRow[], includeGuide = true) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([]);
  const columns = getTemplateWorkbookColumns(template);

  XLSX.utils.sheet_add_aoa(worksheet, [[`${template.name} Workbook`]], { origin: "A1" });
  XLSX.utils.sheet_add_aoa(worksheet, [[`Rows exported from template "${template.name}"`]], { origin: "A2" });
  XLSX.utils.sheet_add_aoa(worksheet, [[`Exported at ${new Date().toISOString()}`]], { origin: "A3" });
  XLSX.utils.sheet_add_aoa(worksheet, [columns.map((column) => column.header)], { origin: "A4" });

  const dataStartRow = 5;
  rows.forEach((row, index) => {
    const values = columns.map((column) => row[column.key] ?? "");
    XLSX.utils.sheet_add_aoa(worksheet, [values], { origin: { r: dataStartRow - 1 + index, c: 0 } });
  });

  worksheet["!cols"] = columns.map((column) => ({ wch: column.width }));
  worksheet["!autofilter"] = { ref: `A4:${XLSX.utils.encode_col(columns.length - 1)}${Math.max(dataStartRow, dataStartRow + rows.length)}` };

  XLSX.utils.book_append_sheet(workbook, worksheet, "Template_Records");

  if (includeGuide) {
    const guideRows = [
      ["field_id", "label", "type", "required", "notes"],
      ...template.fields.map((field) => [
        field.id,
        getFieldLabel(field),
        field.type,
        field.required ? "yes" : "no",
        field.placeholderMy || field.placeholderEn || field.placeholder || "",
      ]),
    ];
    const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);
    guideSheet["!cols"] = [{ wch: 26 }, { wch: 26 }, { wch: 16 }, { wch: 12 }, { wch: 32 }];
    XLSX.utils.book_append_sheet(workbook, guideSheet, "Field_Guide");
  }

  return workbook;
}

export function parseTemplateWorkbookRows(workbookBuffer: ArrayBuffer, template: Template): TemplateWorkbookRow[] {
  const workbook = XLSX.read(workbookBuffer, { type: "array" });
  const sheetName = workbook.SheetNames.includes("Template_Records")
    ? "Template_Records"
    : workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
  const headerRowIndex = rows.findIndex((row) => {
    const normalized = row.map((cell) => normalizeKey(cell));
    return normalized.includes("template_id") && normalized.includes("drive_link");
  });
  const resolvedHeaderIndex = headerRowIndex >= 0 ? headerRowIndex : 3;
  const headers = (rows[resolvedHeaderIndex] ?? []).map((cell) => normalizeText(cell));
  const customColumns = buildCustomColumns(template);

  const headerToKey = headers.map((header) => {
    const normalized = normalizeKey(header);
    const customColumn = customColumns.find(
      (column) => normalizeKey(column.header) === normalized || normalizeKey(column.fieldId) === normalized,
    );
    if (customColumn?.fieldId) return customColumn.fieldId;
    return header;
  });

  return rows.slice(resolvedHeaderIndex + 1).reduce<TemplateWorkbookRow[]>((result, row) => {
    if (!row.some((cell) => normalizeText(cell))) return result;
    const entry: TemplateWorkbookRow = {};
    headerToKey.forEach((key, index) => {
      const value = normalizeText(row[index]);
      if (!key || !value) return;
      entry[key] = value;
    });
    result.push(entry);
    return result;
  }, []);
}

export function buildTemplateWorkbookDownloadName(template: Template, suffix: string) {
  const safeName = template.name.replace(/[\\/:*?"<>|]+/g, "_").trim() || template.id;
  return `${safeName}_${suffix}.xlsx`;
}

export function buildTemplateWorkbookDocumentPayload(
  template: Template,
  row: Record<string, unknown>,
): Partial<Document> {
  const customFields = Object.fromEntries(
    template.fields.map((field) => [
      field.id,
      readRowValue(row, {
        key: `custom_${field.id}`,
        header: getFieldLabel(field),
        label: getFieldLabel(field),
        width: 0,
        kind: "custom",
        fieldId: field.id,
      }),
    ]),
  );

  const seatPrefix = normalizeText(row.seat_prefix);
  const certificateNo = normalizeText(row.certificate_no);
  const seatNo = normalizeText(row.seat_no) || [seatPrefix, certificateNo].filter(Boolean).join(" ").trim();
  const academicYear = normalizeText(row.academic_year) || normalizeText(row.year);
  const studentName = normalizeText(row.student_name) || normalizeText(row.title) || template.name;
  const title =
    normalizeText(row.title) ||
    [seatNo, academicYear ? `(${academicYear})` : "", studentName].filter(Boolean).join(" ").trim() ||
    template.name;

  const driveLink = normalizeText(row.drive_link);
  const driveFileId = normalizeText(row.drive_file_id) || extractDriveFileId(driveLink);
  const syncState: "synced" | "pending" = driveLink || driveFileId ? "synced" : "pending";

  return {
    title,
    templateId: template.id,
    templateName: template.name,
    serviceType: template.serviceType,
    fields: customFields,
    index: normalizeText(row.index) || undefined,
    year: normalizeText(row.year) || academicYear || undefined,
    seatPrefix: seatPrefix || undefined,
    seatNo: seatNo || undefined,
    seatNumber: seatNo || undefined,
    certificateNo: certificateNo || undefined,
    studentName,
    fatherName: normalizeText(row.father_name) || undefined,
    township: normalizeText(row.township) || undefined,
    submittedBy: normalizeText(row.submitted_by) || undefined,
    submittedDate: normalizeText(row.submitted_date) || undefined,
    receivedDate: normalizeText(row.received_date) || undefined,
    returnedDate: normalizeText(row.returned_date) || undefined,
    issuedBy: normalizeText(row.issued_by) || undefined,
    school: normalizeText(row.school) || undefined,
    academicYear: academicYear || undefined,
    agent: normalizeText(row.agent) || undefined,
    date: normalizeText(row.date) || undefined,
    status: (normalizeText(row.status) || "active") as Document["status"],
    driveFileId: driveFileId || undefined,
    driveFileUrl: driveLink || undefined,
    driveFileName: normalizeText(row.drive_file_name) || undefined,
    driveFolderLink: normalizeText(row.drive_folder_link) || undefined,
    driveFolderPath: normalizeText(row.drive_folder_path) || undefined,
    driveMatchMethod: normalizeText(row.match_method) || undefined,
    driveMatchConfidence: normalizeText(row.match_confidence) ? Number(normalizeText(row.match_confidence)) : undefined,
    notes: normalizeText(row.notes) || undefined,
    driveSyncStatus: syncState,
    driveSyncedAt: syncState === "synced" ? new Date().toISOString() : undefined,
    driveSyncError: undefined,
  };
}

export function buildTemplateWorkbookRowSignature(template: Template, row: Record<string, unknown>): string {
  const excluded = new Set([
    "row_status",
    "template_id",
    "template_name",
    "app_document_id",
    "drive_link",
    "drive_file_id",
    "drive_file_name",
    "drive_folder_link",
    "drive_folder_path",
    "match_method",
    "match_confidence",
  ]);

  return getTemplateWorkbookColumns(template)
    .filter((column) => !excluded.has(column.key))
    .map((column) => `${column.key}:${readRowValue(row, column)}`)
    .filter((segment) => !segment.endsWith(":"))
    .join("|");
}

export function buildTemplateWorkbookImportPlan(
  template: Template,
  rows: TemplateWorkbookRow[],
  existingDocuments: Document[],
  mode: TemplateWorkbookImportMode = "replace",
): { plan: TemplateWorkbookImportDecision[]; summary: TemplateWorkbookImportSummary } {
  const existingById = new Map(existingDocuments.map((document) => [document.id, document]));
  const existingBySignature = new Map<string, Document>();
  const ambiguousSignatures = new Set<string>();

  for (const document of existingDocuments) {
    const signature = buildTemplateWorkbookRowSignature(template, buildTemplateWorkbookRow(document, template));
    if (!signature) continue;
    if (existingBySignature.has(signature)) {
      ambiguousSignatures.add(signature);
      continue;
    }
    existingBySignature.set(signature, document);
  }

  const plan: TemplateWorkbookImportDecision[] = [];
  const summary: TemplateWorkbookImportSummary = {
    total: 0,
    matched: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    ambiguous: 0,
  };

  for (const row of rows) {
    summary.total += 1;
    if (!hasWorkbookRowContent(template, row)) {
      summary.skipped += 1;
      plan.push({ action: "skip", payload: {} as Partial<Document>, reason: "empty_row", row });
      continue;
    }

    const payload = buildTemplateWorkbookDocumentPayload(template, row);
    if (mode === "append") {
      summary.created += 1;
      plan.push({ action: "create", payload, row, reason: "append_mode" });
      continue;
    }

    const appDocumentId = normalizeText(row.app_document_id);
    if (appDocumentId && existingById.has(appDocumentId)) {
      summary.matched += 1;
      summary.updated += 1;
      plan.push({ action: "update", documentId: appDocumentId, payload, row, reason: "app_document_id" });
      continue;
    }

    const signature = buildTemplateWorkbookRowSignature(template, row);
    if (signature && ambiguousSignatures.has(signature)) {
      summary.ambiguous += 1;
      summary.skipped += 1;
      plan.push({ action: "skip", payload, row, reason: "ambiguous_signature" });
      continue;
    }

    const matchedDocument = signature ? existingBySignature.get(signature) : null;
    if (matchedDocument) {
      summary.matched += 1;
      summary.updated += 1;
      plan.push({ action: "update", documentId: matchedDocument.id, payload, row, reason: "row_signature" });
      continue;
    }

    summary.created += 1;
    plan.push({ action: "create", payload, row, reason: "new_row" });
  }

  return { plan, summary };
}
