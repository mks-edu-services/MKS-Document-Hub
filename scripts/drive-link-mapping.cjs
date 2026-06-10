const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

const repoRoot = path.resolve(__dirname, "..");
const defaultWorkbookPath = path.join(repoRoot, "outputs", "drive-link-template", "Google_Drive_File_Mapping_Template.xlsx");
const defaultServiceAccountPath = path.join(
  repoRoot,
  "mks-certificate-app-cbf64-firebase-adminsdk-fbsvc-09ad142660.json",
);
const projectId = process.env.FIREBASE_PROJECT_ID || "mks-certificate-app-cbf64";
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
  defaultServiceAccountPath;

const COLUMNS = [
  { key: "row_status", header: "row_status", label: "Status", width: 18, guide: "matched / pending / review / duplicate / missing_drive_link" },
  { key: "doc_type", header: "doc_type", label: "Document Type", width: 18, guide: "certificate / degree / transcript / translation / notary / other" },
  { key: "academic_year", header: "academic_year", label: "Academic Year", width: 16, guide: "ဥပမာ 2025 သို့မဟုတ် 2025-2026" },
  { key: "local_root_path", header: "local_root_path", label: "Local Root Path", width: 30, guide: "ဥပမာ D:\\MKS\\အောင်လက်မှတ် စုစုပေါင်း" },
  { key: "year_folder_name", header: "year_folder_name", label: "Year Folder", width: 22, guide: "ဥပမာ အောင်လက်မှတ် 2025" },
  { key: "month_folder_name", header: "month_folder_name", label: "Month Folder", width: 18, guide: "ဥပမာ 08-2025" },
  { key: "day_or_group_folder_name", header: "day_or_group_folder_name", label: "Day / Group Folder", width: 24, guide: "ဥပမာ 26082025 သို့မဟုတ် group name" },
  { key: "local_file_name", header: "local_file_name", label: "Local File Name", width: 26, guide: "ဖိုင်နာမည်" },
  { key: "local_full_path", header: "local_full_path", label: "Local Full Path", width: 44, guide: "root > year > month > day/group > file" },
  { key: "seat_no", header: "seat_no", label: "Seat No", width: 16, guide: "ဥပမာ စဟမ ၁၁" },
  { key: "student_name", header: "student_name", label: "Student Name", width: 22, guide: "ဥပမာ မနီနီအောင်" },
  { key: "file_alias", header: "file_alias", label: "File Alias", width: 24, guide: "search အတွက် ခေါင်းစဉ်တို" },
  { key: "drive_link", header: "drive_link", label: "Drive Link", width: 42, guide: "Google Drive မှ Copy link to clipboard နဲ့ယူထားတဲ့ link" },
  { key: "drive_file_id", header: "drive_file_id", label: "Drive File ID", width: 28, guide: "link ထဲက file id ကို အလိုအလျောက်ဖမ်းနိုင်" },
  { key: "drive_file_name", header: "drive_file_name", label: "Drive File Name", width: 28, guide: "Drive ထဲက file name" },
  { key: "drive_folder_link", header: "drive_folder_link", label: "Drive Folder Link", width: 42, guide: "ဖိုင်ရှိသော folder link" },
  { key: "drive_folder_path", header: "drive_folder_path", label: "Drive Folder Path", width: 34, guide: "Drive folder hierarchy" },
  { key: "app_document_id", header: "app_document_id", label: "App Document ID", width: 24, guide: "MKS app ထဲက document id" },
  { key: "match_method", header: "match_method", label: "Match Method", width: 22, guide: "app_document_id / seat_no+student_name / manual" },
  { key: "match_confidence", header: "match_confidence", label: "Match Confidence", width: 18, guide: "0-100" },
  { key: "notes", header: "notes", label: "Notes", width: 28, guide: "extra remarks" },
];

const ROW_STATUS_OPTIONS = ["matched", "pending", "review", "duplicate", "missing_drive_link"];
const DOC_TYPE_OPTIONS = ["certificate", "degree", "transcript", "translation", "notary", "other"];

const args = parseArgs(process.argv.slice(2));

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

function parseArgs(argv) {
  const parsed = {
    command: argv[0] || "export",
    workbookPath: defaultWorkbookPath,
    outputPath: defaultWorkbookPath,
    dryRun: false,
    limit: null,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg.startsWith("--workbook=")) {
      parsed.workbookPath = arg.split("=", 2)[1];
      continue;
    }
    if (arg === "--workbook") {
      parsed.workbookPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--output=")) {
      parsed.outputPath = arg.split("=", 2)[1];
      continue;
    }
    if (arg === "--output") {
      parsed.outputPath = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      parsed.limit = Number(arg.split("=", 2)[1]);
      continue;
    }
    if (arg === "--limit") {
      parsed.limit = Number(argv[index + 1]);
      index += 1;
    }
  }

  return parsed;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalizeKey(value) {
  return normalizeText(value).replace(/\s+/g, " ").toLowerCase();
}

function extractDriveFileId(value) {
  const input = normalizeText(value);
  if (!input) return "";

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /\/document\/d\/([a-zA-Z0-9_-]+)/i,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) return match[1];
  }

  if (/^[a-zA-Z0-9_-]{10,}$/.test(input) && !input.includes(" ")) {
    return input;
  }

  return "";
}

function normalizeDriveLink(value) {
  const input = normalizeText(value);
  if (!input) return "";
  const fileId = extractDriveFileId(input);
  if (!fileId) return input;
  return input.includes("drive.google.com") ? input : `https://drive.google.com/open?id=${fileId}`;
}

function parseNumber(value) {
  const input = normalizeText(value);
  if (!input) return null;
  const number = Number(input);
  return Number.isFinite(number) ? number : null;
}

function base64Url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function signJwt(privateKey, payload) {
  const header = { alg: "RS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();
  const signature = signer.sign(privateKey);
  return `${encodedHeader}.${encodedPayload}.${base64Url(signature)}`;
}

async function loadServiceAccount() {
  const raw = await fs.readFile(serviceAccountPath, "utf8");
  return JSON.parse(raw);
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(serviceAccount.private_key, {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mint access token: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

function encodeFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((item) => encodeFirestoreValue(item)) } };
  }
  if (value instanceof Date) {
    return { stringValue: value.toISOString() };
  }
  switch (typeof value) {
    case "string":
      return { stringValue: value };
    case "number":
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    case "boolean":
      return { booleanValue: value };
    case "object": {
      const fields = {};
      for (const [key, nested] of Object.entries(value)) {
        if (nested === undefined) continue;
        fields[key] = encodeFirestoreValue(nested);
      }
      return { mapValue: { fields } };
    }
    default:
      return { stringValue: String(value) };
  }
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== "object") return null;
  if ("stringValue" in value) return value.stringValue ?? "";
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue ?? "";
  if ("arrayValue" in value) {
    return (value.arrayValue?.values ?? []).map((entry) => decodeFirestoreValue(entry));
  }
  if ("mapValue" in value) {
    const result = {};
    const fields = value.mapValue?.fields ?? {};
    for (const [key, nested] of Object.entries(fields)) {
      result[key] = decodeFirestoreValue(nested);
    }
    return result;
  }
  return null;
}

function buildDocumentName(collectionId, docId) {
  return `projects/${projectId}/databases/(default)/documents/${collectionId}/${docId}`;
}

function buildWrite(collectionId, docId, data) {
  const fields = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    fields[key] = encodeFirestoreValue(value);
  }
  return {
    update: {
      name: buildDocumentName(collectionId, docId),
      fields,
    },
    updateMask: {
      fieldPaths: Object.keys(fields),
    },
  };
}

async function commitWrites(accessToken, writes) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    },
  );

  if (!response.ok) {
    throw new Error(`Firestore commit failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function fetchCollectionDocuments(accessToken, collectionId) {
  const documents = [];
  let pageToken = "";

  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionId}`);
    url.searchParams.set("pageSize", "300");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to list ${collectionId}: ${response.status} ${await response.text()}`);
    }

    const payload = await response.json();
    for (const doc of payload.documents ?? []) {
      const id = doc.name.split("/").pop();
      const fields = {};
      for (const [key, value] of Object.entries(doc.fields ?? {})) {
        fields[key] = decodeFirestoreValue(value);
      }
      documents.push({ id, ...fields });
    }
    pageToken = payload.nextPageToken || "";
  } while (pageToken);

  return documents;
}

function parseWorkbookRows(workbookPath) {
  const pythonScript = `
import json
from datetime import date, datetime
from openpyxl import load_workbook
import sys

path = sys.argv[1]
wb = load_workbook(path, data_only=True)
ws = wb["Drive_Mapping"] if "Drive_Mapping" in wb.sheetnames else wb.active
headers = []
for col in range(1, ws.max_column + 1):
    value = ws.cell(row=4, column=col).value
    headers.append("" if value is None else str(value).strip())

rows = []
for row in ws.iter_rows(min_row=5, values_only=True):
    if not any(cell not in (None, "") for cell in row):
        continue
    values = []
    for cell in row[:len(headers)]:
        if isinstance(cell, (datetime, date)):
            values.append(cell.isoformat()[:10])
        elif cell is None:
            values.append("")
        else:
            values.append(str(cell).strip())
    rows.append(values)

print(json.dumps({
    "sheetName": ws.title,
    "headers": headers,
    "rows": rows,
}, ensure_ascii=False))
`;

  const result = spawnSync(
    process.env.PYTHON || "python",
    ["-c", pythonScript, workbookPath || args.workbookPath],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 16 },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to parse workbook");
  }

  return JSON.parse(result.stdout);
}

async function exportWorkbook(outputPath) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const pythonScript = `
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter
import json
import sys

output_path = sys.argv[1]
columns = json.loads(sys.argv[2])
status_options = json.loads(sys.argv[3])
doc_type_options = json.loads(sys.argv[4])
guide_rows = json.loads(sys.argv[5])

wb = Workbook()
ws = wb.active
ws.title = "Drive_Mapping"
guide = wb.create_sheet("Column_Guide")

title_fill = PatternFill("solid", fgColor="0F4C81")
note_fill = PatternFill("solid", fgColor="EEF6FB")
header_fill = PatternFill("solid", fgColor="008080")
teal_fill = PatternFill("solid", fgColor="E8F7F5")
white_font = Font(color="FFFFFF", bold=True)
title_font = Font(color="FFFFFF", bold=True, size=16)
header_font = Font(color="FFFFFF", bold=True)
section_font = Font(color="0F4C81", bold=True, size=14)
thin = Side(style="thin", color="D0D7E2")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

last_col = get_column_letter(len(columns))
ws.merge_cells(f"A1:{last_col}1")
ws["A1"] = "Google Drive File Mapping Template"
ws["A1"].fill = title_fill
ws["A1"].font = title_font
ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
ws.row_dimensions[1].height = 24

ws.merge_cells(f"A2:{last_col}2")
ws["A2"] = "Row တစ်ကြောင်း = ဖိုင်တစ်ဖိုင်။ Google Drive မှာ Copy link to clipboard နဲ့ယူထားတဲ့ link ကို drive_link column ထဲထည့်ပါ။"
ws["A2"].fill = note_fill
ws["A2"].alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
ws["A2"].font = Font(color="1F2937")
ws.row_dimensions[2].height = 32

ws.merge_cells(f"A3:{last_col}3")
ws["A3"] = "Folder pattern: local_root_path > year_folder_name > month_folder_name > day_or_group_folder_name > local_file_name"
ws["A3"].fill = teal_fill
ws["A3"].alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
ws["A3"].font = Font(color="0F4C81", bold=True)
ws.row_dimensions[3].height = 24

for idx, column in enumerate(columns, start=1):
    cell = ws.cell(row=4, column=idx)
    cell.value = column["header"]
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = border
    ws.column_dimensions[get_column_letter(idx)].width = max(12, min(52, column["width"] * 0.9))

ws.freeze_panes = "A5"
ws.auto_filter.ref = f"A4:{last_col}2000"

status_validation = DataValidation(type="list", formula1='"' + ",".join(status_options) + '"', allow_blank=True)
doc_type_validation = DataValidation(type="list", formula1='"' + ",".join(doc_type_options) + '"', allow_blank=True)
ws.add_data_validation(status_validation)
ws.add_data_validation(doc_type_validation)
status_validation.add(f"A5:A2000")
doc_type_validation.add(f"B5:B2000")

for row in range(5, 2001):
    for col in range(1, len(columns) + 1):
        cell = ws.cell(row=row, column=col)
        cell.border = border
        cell.alignment = Alignment(vertical="top", wrap_text=True)

guide.merge_cells("A1:D1")
guide["A1"] = "Column Guide"
guide["A1"].fill = title_fill
guide["A1"].font = title_font
guide["A1"].alignment = Alignment(horizontal="center", vertical="center")
guide.row_dimensions[1].height = 24

guide["A3"] = "Field"
guide["B3"] = "What to enter"
guide["C3"] = "Example"
guide["D3"] = "Import note"
for cell in guide[3]:
    cell.fill = header_fill
    cell.font = header_font
    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    cell.border = border

for row_index, row_values in enumerate(guide_rows, start=4):
    for col_index, value in enumerate(row_values, start=1):
        cell = guide.cell(row=row_index, column=col_index, value=value)
        cell.border = border
        cell.alignment = Alignment(vertical="top", wrap_text=True)

for col, width in {"A": 24, "B": 24, "C": 34, "D": 28}.items():
    guide.column_dimensions[col].width = width
guide.freeze_panes = "A4"

wb.save(output_path)
print(output_path)
`;

  const result = spawnSync(
    process.env.PYTHON || "python",
    [
      "-c",
      pythonScript,
      outputPath,
      JSON.stringify(COLUMNS),
      JSON.stringify(ROW_STATUS_OPTIONS),
      JSON.stringify(DOC_TYPE_OPTIONS),
      JSON.stringify([
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
      ]),
    ],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 8 },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to export workbook");
  }

  return outputPath;
}

function parseDriveRow(headers, values) {
  const row = {};
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    if (!header) continue;
    row[header] = normalizeText(values[index] ?? "");
  }
  return row;
}

function buildFirestoreKey(doc) {
  const seat = normalizeKey(doc.seatNo || doc.seat_no || doc.seatNumber || "");
  const name = normalizeKey(doc.studentName || doc.student_name || "");
  const year = normalizeKey(doc.academicYear || doc.academic_year || "");
  if (seat && name && year) return `${seat}|${name}|${year}`;
  if (seat && name) return `${seat}|${name}`;
  return "";
}

async function importWorkbook(workbookPath, { dryRun }) {
  const workbook = parseWorkbookRows(workbookPath);
  const serviceAccount = await loadServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const docs = await fetchCollectionDocuments(accessToken, "documents");

  const docsById = new Map(docs.map((doc) => [normalizeKey(doc.id), doc]));
  const docsByKey = new Map();
  for (const doc of docs) {
    const key = buildFirestoreKey(doc);
    if (!key) continue;
    const list = docsByKey.get(key) || [];
    list.push(doc);
    docsByKey.set(key, list);
  }

  const updates = [];
  const unmatched = [];
  const ambiguous = [];

  for (const values of workbook.rows) {
    const row = parseDriveRow(workbook.headers, values);
    const driveLink = normalizeDriveLink(row.drive_link);
    const driveFileId = row.drive_file_id || extractDriveFileId(driveLink);
    const canonicalDriveLink = driveLink || (driveFileId ? `https://drive.google.com/open?id=${driveFileId}` : "");
    const appDocumentId = normalizeText(row.app_document_id);

    let match = null;
    let matchMethod = normalizeText(row.match_method) || "manual";

    if (appDocumentId && docsById.has(normalizeKey(appDocumentId))) {
      match = docsById.get(normalizeKey(appDocumentId));
      matchMethod = "app_document_id";
    } else {
      const key = buildFirestoreKey({
        seatNo: row.seat_no,
        studentName: row.student_name,
        academicYear: row.academic_year,
      });
      const candidates = docsByKey.get(key) || [];
      if (candidates.length === 1) {
        match = candidates[0];
        matchMethod = "seat_no+student_name+academic_year";
      } else if (candidates.length > 1) {
        ambiguous.push({ row, candidates: candidates.map((doc) => doc.id) });
        continue;
      }
    }

    if (!match) {
      unmatched.push(row);
      continue;
    }

    if (!canonicalDriveLink && !driveFileId) {
      continue;
    }

    const update = {
      driveFileUrl: canonicalDriveLink || undefined,
      driveFileId: driveFileId || undefined,
      driveFileName: row.drive_file_name || undefined,
      driveFolderLink: row.drive_folder_link || undefined,
      driveFolderPath: row.drive_folder_path || undefined,
      driveMatchMethod: matchMethod,
      driveMatchConfidence: parseNumber(row.match_confidence) ?? undefined,
      driveSyncStatus: "synced",
      driveSyncedAt: new Date().toISOString(),
      driveSyncError: undefined,
    };

    updates.push({
      docId: match.id,
      row,
      update,
    });
  }

  console.log(`Workbook: ${path.basename(workbookPath)}`);
  console.log(`Parsed rows: ${workbook.rows.length}`);
  console.log(`Matched rows ready to update: ${updates.length}`);
  console.log(`Unmatched rows: ${unmatched.length}`);
  console.log(`Ambiguous rows: ${ambiguous.length}`);

  if (dryRun) {
    console.log(JSON.stringify({
      firstUpdate: updates[0] || null,
      unmatched: unmatched.slice(0, 10),
      ambiguous: ambiguous.slice(0, 10),
    }, null, 2));
    return;
  }

  if (updates.length === 0) {
    console.log("No Drive links to import.");
    return;
  }

  const batchSize = 100;
  let committed = 0;
  for (let index = 0; index < updates.length; index += batchSize) {
    const batch = updates.slice(index, index + batchSize);
    const writes = batch.map((item) => buildWrite("documents", item.docId, item.update));
    await commitWrites(accessToken, writes);
    committed += batch.length;
    console.log(`Committed ${committed}/${updates.length} Drive link updates`);
  }
}

async function main() {
  if (args.command === "export") {
    const target = args.outputPath || defaultWorkbookPath;
    const saved = await exportWorkbook(target);
    console.log(saved);
    return;
  }

  if (args.command === "import") {
    await importWorkbook(args.workbookPath, { dryRun: args.dryRun });
    return;
  }

  throw new Error(`Unknown command: ${args.command}. Use "export" or "import".`);
}
