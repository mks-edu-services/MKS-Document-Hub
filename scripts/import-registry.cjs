const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");

const repoRoot = path.resolve(__dirname, "..");
const defaultWorkbookPath = path.join(repoRoot, "assets", "2025 အောင်လက်မှတ်ထုတ်ယူစာရင်း.xlsx");
const defaultServiceAccountPath = path.join(
  repoRoot,
  "mks-certificate-app-cbf64-firebase-adminsdk-fbsvc-09ad142660.json",
);
const projectId = process.env.FIREBASE_PROJECT_ID || "mks-certificate-app-cbf64";
const workbookPath = process.env.REGISTRY_WORKBOOK_PATH || defaultWorkbookPath;
const workbookPaths = (process.env.REGISTRY_WORKBOOK_PATHS || "")
  .split(/[,;]+/)
  .map((value) => value.trim())
  .filter(Boolean);
const serviceAccountPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS ||
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
  defaultServiceAccountPath;

const REGISTRY_PROFILE = {
  templateId: "registry-2025-certificate",
  templateNameMy: "2025 အောင်လက်မှတ် စာရင်း",
  templateNameEn: "2025 Certificate Registry",
  serviceType: "Degree Certificate",
  columns: [
    { header: "စဉ်", id: "index", labelMy: "စဉ်", labelEn: "Index", type: "number" },
    { header: "ခုံ", id: "seatPrefix", labelMy: "ခုံ", labelEn: "Seat Prefix", type: "text" },
    { header: "အမှတ်", id: "certificateNo", labelMy: "အမှတ်", labelEn: "Certificate No.", type: "text" },
    { header: "ခုနှစ်", id: "year", labelMy: "ခုနှစ်", labelEn: "Year", type: "number" },
    { header: "အမည်", id: "name", labelMy: "အမည်", labelEn: "Name", type: "text" },
    { header: "အဖအမည်", id: "fatherName", labelMy: "အဖအမည်", labelEn: "Father Name", type: "text" },
    { header: "မြို့နယ်", id: "township", labelMy: "မြို့နယ်", labelEn: "Township", type: "text" },
    { header: "အပ်နှံသူ", id: "submittedBy", labelMy: "အပ်နှံသူ", labelEn: "Submitted By", type: "text" },
    { header: "အပ်နှံ ရက်စွဲ", id: "submittedDate", labelMy: "အပ်နှံ ရက်စွဲ", labelEn: "Submitted Date", type: "date" },
    { header: "ရရှိ ရက်စွဲ", id: "receivedDate", labelMy: "ရရှိ ရက်စွဲ", labelEn: "Received Date", type: "date" },
    { header: "ပြန်ပို့ ရက်စွဲ", id: "returnedDate", labelMy: "ပြန်ပို့ ရက်စွဲ", labelEn: "Returned Date", type: "date" },
    { header: "ထုတ်ပေးသူ", id: "issuedBy", labelMy: "ထုတ်ပေးသူ", labelEn: "Issued By", type: "text" },
    { header: "မှတ်ချက်", id: "notes", labelMy: "မှတ်ချက်", labelEn: "Notes", type: "textarea" },
  ],
};

const FIELD_DEFS = REGISTRY_PROFILE.columns;

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  const parsed = { dryRun: false, limit: null, resetTemplates: false, workbookPaths: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--reset-templates") {
      parsed.resetTemplates = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      parsed.limit = Number(arg.split("=", 2)[1]);
      continue;
    }
    if (arg === "--limit") {
      parsed.limit = Number(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg.startsWith("--workbook=")) {
      parsed.workbookPaths.push(arg.split("=", 2)[1]);
      continue;
    }
    if (arg === "--workbook") {
      parsed.workbookPaths.push(argv[index + 1]);
      index += 1;
    }
  }
  return parsed;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return text;
}

function toFieldValue(value) {
  const text = normalizeText(value);
  return text;
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

function buildDrivePreviewPageUrl(value) {
  const fileId = extractDriveFileId(value);
  if (!fileId) return "";
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function getFileNameFromPath(value) {
  const input = normalizeText(value);
  if (!input) return "";
  const parts = input.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || "";
}

function buildHeaderValueMap(headers, values) {
  const map = new Map();
  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    if (!header) continue;
    map.set(header, values[index] ?? "");
  }
  return map;
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
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
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

function buildTemplateRecord(nowIso, sourcePaths) {
  return {
    id: REGISTRY_PROFILE.templateId,
    name: REGISTRY_PROFILE.templateNameMy,
    nameMy: REGISTRY_PROFILE.templateNameMy,
    nameEn: REGISTRY_PROFILE.templateNameEn,
    serviceType: REGISTRY_PROFILE.serviceType,
    descriptionMy: "2025 Excel registry မှတင်သွင်းထားသော template",
    descriptionEn: "Template imported from the 2025 Excel registry",
    registryKind: "university-certificate",
    registrySchema: {
      sourceWorkbook: sourcePaths.map((item) => path.basename(item)).join(", "),
      sourceSheet: sourcePaths.map((item) => path.basename(item)).join(", "),
      combinedSeatFields: ["seatPrefix", "certificateNo"],
      searchableFields: ["index", "seatPrefix", "certificateNo", "year", "name", "fatherName", "township", "submittedBy", "issuedBy"],
      columns: FIELD_DEFS.map((field) => ({
        id: field.id,
        header: field.header,
        labelMy: field.labelMy,
        labelEn: field.labelEn,
        type: field.type,
      })),
    },
    fields: FIELD_DEFS.map((field) => ({
      id: field.id,
      label: field.labelMy,
      labelMy: field.labelMy,
      labelEn: field.labelEn,
      type: field.type,
      required: field.id === "seatPrefix" || field.id === "certificateNo" || field.id === "name",
      placeholderMy: field.labelMy,
      placeholderEn: field.labelEn,
    })),
    createdBy: "migration",
    createdAt: nowIso,
    updatedAt: nowIso,
    active: true,
  };
}

function buildRegistryDocument(headers, row, rowIndex, nowIso) {
  const valuesByHeader = buildHeaderValueMap(headers, row.values);
  const rawIndex = toFieldValue(valuesByHeader.get("စဉ်"));
  const seatPrefix = toFieldValue(valuesByHeader.get("ခုံ"));
  const certificateNo = toFieldValue(valuesByHeader.get("အမှတ်"));
  const academicYear = toFieldValue(valuesByHeader.get("ခုနှစ်"));
  const studentName = toFieldValue(valuesByHeader.get("အမည်"));
  const fatherName = toFieldValue(valuesByHeader.get("အဖအမည်"));
  const township = toFieldValue(valuesByHeader.get("မြို့နယ်"));
  const submittedBy = toFieldValue(valuesByHeader.get("အပ်နှံသူ"));
  const submittedDate = toFieldValue(valuesByHeader.get("အပ်နှံ ရက်စွဲ"));
  const receivedDate = toFieldValue(valuesByHeader.get("ရရှိ ရက်စွဲ"));
  const returnedDate = toFieldValue(valuesByHeader.get("ပြန်ပို့ ရက်စွဲ"));
  const issuedBy = toFieldValue(valuesByHeader.get("ထုတ်ပေးသူ"));
  const notes = toFieldValue(valuesByHeader.get("မှတ်ချက်"));
  const googleLink = toFieldValue(valuesByHeader.get("Google Link"));
  const localLink = toFieldValue(valuesByHeader.get("Local Link"));
  const indexValue = rawIndex || String(rowIndex);
  const seatNo = [seatPrefix, certificateNo].filter(Boolean).join(" ").trim();
  const driveFileId = extractDriveFileId(googleLink);
  const fileName = getFileNameFromPath(localLink) || `${seatNo || indexValue}.jpg`;
  const normalizedGoogleLink = normalizeDriveLink(googleLink);
  const previewPageUrl = buildDrivePreviewPageUrl(googleLink);

  const fields = {};
  for (const field of FIELD_DEFS) {
    fields[field.id] = toFieldValue(valuesByHeader.get(field.header));
  }

  const titleHead = [seatNo, academicYear ? `(${academicYear})` : ""].filter(Boolean).join(" ").trim();
  const title = [titleHead, studentName].filter(Boolean).join(" - ").trim() || `Registry Row ${rowIndex}`;
  const scanSearchKey = [indexValue, seatNo, seatPrefix, certificateNo, studentName, academicYear, fatherName, township, submittedBy, issuedBy].filter(Boolean).join(" ");
  const docId = `registry-2025-${String(rowIndex).padStart(4, "0")}`;

  return {
    docId,
    data: {
      title,
      templateId: REGISTRY_PROFILE.templateId,
      templateName: REGISTRY_PROFILE.templateNameMy,
      serviceType: REGISTRY_PROFILE.serviceType,
      fields,
      index: indexValue,
      year: academicYear,
      seatPrefix,
      seatNo,
      seatNumber: seatNo,
      certificateNo,
      studentName,
      school: township,
      academicYear,
      agent: submittedBy,
      date: submittedDate || receivedDate || returnedDate || "",
      status: "active",
      driveSyncStatus: "pending",
      notes,
      createdBy: "migration",
      createdAt: nowIso,
      updatedAt: nowIso,
      scanSearchKey,
      driveFileId: driveFileId || undefined,
      driveFileName: fileName || undefined,
      driveFileUrl: normalizedGoogleLink || undefined,
      driveFolderPath: localLink ? path.dirname(localLink) : undefined,
      scanFileId: driveFileId || undefined,
      scanFileName: fileName || undefined,
      scanFileUrl: normalizedGoogleLink || undefined,
      scanPreviewUrl: previewPageUrl || undefined,
      driveSyncError: "",
      driveSyncedAt: "",
      // Preserve a few workbook-specific fields at the top level for quick lookup.
      fatherName,
      submittedDate,
      receivedDate,
      returnedDate,
      issuedBy,
      notes,
      localLink: localLink || undefined,
    },
  };
}

function parseWorkbook(workbookPathToRead) {
  const pythonScript = `
import json
from datetime import date, datetime
from openpyxl import load_workbook
import sys

path = sys.argv[1]
wb = load_workbook(path, data_only=True)
ws = wb.active
headers = []
for col in range(1, ws.max_column + 1):
    value = ws.cell(row=1, column=col).value
    headers.append("" if value is None else str(value).strip())

rows = []
for row in ws.iter_rows(min_row=2, values_only=True):
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
    ["-c", pythonScript, workbookPathToRead],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 16 },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to parse workbook");
  }

  return JSON.parse(result.stdout);
}

function normalizeKey(value) {
  return normalizeText(value).replace(/\s+/g, " ").toLowerCase();
}

function buildRegistryKey(data) {
  const indexValue = normalizeKey(data.index);
  const seatPrefix = normalizeKey(data.seatPrefix || data.seat);
  const certificateNo = normalizeKey(data.certificateNo || data.certificate);
  const seatNo = normalizeKey(data.seatNo || data.seatNumber || [data.seatPrefix, data.certificateNo].filter(Boolean).join(" "));
  const studentName = normalizeKey(data.studentName || data.name);
  const academicYear = normalizeKey(data.academicYear || data.year);
  const driveFileId = normalizeKey(data.driveFileId || extractDriveFileId(data.driveFileUrl) || extractDriveFileId(data.scanFileUrl));
  return [
    driveFileId ? `drive:${driveFileId}` : "",
    indexValue && seatNo && studentName ? `idx:${indexValue}|${seatNo}|${studentName}|${academicYear}` : "",
    seatNo && studentName ? `seat:${seatNo}|${studentName}|${academicYear}` : "",
    seatPrefix && certificateNo && studentName ? `prefix:${seatPrefix}|${certificateNo}|${studentName}|${academicYear}` : "",
    seatNo && studentName ? `seatname:${seatNo}|${studentName}` : "",
  ].filter(Boolean);
}

function mergeRecord(existing, incoming) {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "fields" && value && typeof value === "object" && !Array.isArray(value)) {
      merged.fields = { ...(existing.fields ?? {}) };
      for (const [fieldKey, fieldValue] of Object.entries(value)) {
        if (fieldValue === undefined || fieldValue === null || fieldValue === "") continue;
        merged.fields[fieldKey] = fieldValue;
      }
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

function indexPreparedDocument(docsById, docsByKey, doc) {
  const identifiers = new Set([
    doc.id,
    doc.driveFileId,
    doc.scanFileId,
    extractDriveFileId(doc.driveFileUrl),
    extractDriveFileId(doc.scanFileUrl),
  ].filter(Boolean).map(normalizeKey));

  for (const identifier of identifiers) {
    docsById.set(identifier, [doc]);
  }

  for (const key of buildRegistryKey(doc)) {
    const existing = docsByKey.get(key) || [];
    const next = existing.filter((entry) => normalizeKey(entry.id) !== normalizeKey(doc.id));
    next.push(doc);
    docsByKey.set(key, next);
  }
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

async function loadServiceAccount() {
  const raw = await fs.readFile(serviceAccountPath, "utf8");
  return JSON.parse(raw);
}

async function main() {
  const nowIso = new Date().toISOString();
  const serviceAccount = await loadServiceAccount();
  const accessToken = await getAccessToken(serviceAccount);
  const sourcePaths = [
    ...new Set([
      ...args.workbookPaths,
      ...workbookPaths,
    ].filter(Boolean)),
  ];
  if (sourcePaths.length === 0) {
    sourcePaths.push(workbookPath);
  }
  const template = buildTemplateRecord(nowIso, sourcePaths);
  const existingDocs = await fetchCollectionDocuments(accessToken, "documents");
  const docsById = new Map();
  const docsByKey = new Map();
  for (const doc of existingDocs) {
    const identifiers = new Set([
      doc.id,
      doc.driveFileId,
      doc.scanFileId,
      extractDriveFileId(doc.driveFileUrl),
      extractDriveFileId(doc.scanFileUrl),
    ].filter(Boolean).map(normalizeKey));
    for (const identifier of identifiers) {
      const list = docsById.get(identifier) || [];
      list.push(doc);
      docsById.set(identifier, list);
    }
    for (const key of buildRegistryKey(doc)) {
      const list = docsByKey.get(key) || [];
      list.push(doc);
      docsByKey.set(key, list);
    }
  }

  const prepared = [];
  for (const sourcePath of sourcePaths) {
    const workbook = parseWorkbook(sourcePath);
    const records = workbook.rows
      .map((row, index) => buildRegistryDocument(workbook.headers, { values: row }, index + 1, nowIso))
      .filter((record) => record.data.driveFileId || record.data.driveFileUrl);
    console.log(`Workbook: ${path.basename(sourcePath)}`);
    console.log(`Sheet: ${workbook.sheetName}`);
    console.log(`Parsed registry rows: ${workbook.rows.length}`);
    console.log(`Eligible rows with Drive link: ${records.length}`);
    prepared.push(...records.map((record) => ({ ...record, sourcePath })));
  }

  const limitedRecords = args.limit ? prepared.slice(0, args.limit) : prepared;
  console.log(`Template ID: ${REGISTRY_PROFILE.templateId}`);
  console.log(`Total eligible records: ${prepared.length}`);

  const operations = [];
  for (const record of limitedRecords) {
    const keyCandidates = buildRegistryKey(record.data);
    let match = null;

    if (record.data.driveFileId && docsById.has(normalizeKey(record.data.driveFileId))) {
      const matches = docsById.get(normalizeKey(record.data.driveFileId)) || [];
      if (matches.length === 1) {
        match = matches[0];
      } else if (matches.length > 1) {
        match = matches
          .map((doc) => {
            const score = [
              normalizeKey(doc.index) && normalizeKey(doc.index) === normalizeKey(record.data.index) ? 4 : 0,
              normalizeKey(doc.seatNo) && normalizeKey(doc.seatNo) === normalizeKey([record.data.seatPrefix, record.data.certificateNo].filter(Boolean).join(" ")) ? 4 : 0,
              normalizeKey(doc.studentName) && normalizeKey(doc.studentName) === normalizeKey(record.data.studentName) ? 4 : 0,
              normalizeKey(doc.academicYear) && normalizeKey(doc.academicYear) === normalizeKey(record.data.academicYear) ? 2 : 0,
            ].reduce((sum, value) => sum + value, 0);
            return { doc, score };
          })
          .sort((left, right) => right.score - left.score)[0]?.doc || null;
      }
    } else {
      for (const key of keyCandidates) {
        const matches = docsByKey.get(key) || [];
        if (matches.length === 1) {
          match = matches[0];
          break;
        }
        if (matches.length > 1) {
          const scored = matches
            .map((doc) => {
              const score = [
                normalizeKey(doc.index) && normalizeKey(doc.index) === normalizeKey(record.data.index) ? 4 : 0,
                normalizeKey(doc.seatNo) && normalizeKey(doc.seatNo) === normalizeKey([record.data.seatPrefix, record.data.certificateNo].filter(Boolean).join(" ")) ? 4 : 0,
                normalizeKey(doc.studentName) && normalizeKey(doc.studentName) === normalizeKey(record.data.studentName) ? 4 : 0,
                normalizeKey(doc.academicYear) && normalizeKey(doc.academicYear) === normalizeKey(record.data.academicYear) ? 2 : 0,
                normalizeKey(doc.driveFileId) && normalizeKey(doc.driveFileId) === normalizeKey(record.data.driveFileId) ? 8 : 0,
              ].reduce((sum, value) => sum + value, 0);
              return { doc, score };
            })
            .sort((left, right) => right.score - left.score);
          match = scored[0]?.doc || null;
          break;
        }
      }
    }

    const targetDocId = match?.id || (record.data.driveFileId ? `registry-2025-${record.data.driveFileId}` : record.docId);
    const payload = match ? mergeRecord(match, record.data) : record.data;
    const preparedDoc = { id: targetDocId, ...payload };
    indexPreparedDocument(docsById, docsByKey, preparedDoc);
    operations.push({ docId: targetDocId, payload, sourcePath: record.sourcePath, matched: Boolean(match) });
  }

  console.log(`Matched existing docs: ${operations.filter((item) => item.matched).length}`);
  console.log(`New docs to create: ${operations.filter((item) => !item.matched).length}`);

  if (args.dryRun) {
    console.log("Dry run preview:");
    console.log(JSON.stringify({
      template,
      firstOperation: operations[0] || null,
      count: operations.length,
    }, null, 2));
    return;
  }

  const batchSize = 100;
  const batches = [];
  for (let index = 0; index < operations.length; index += batchSize) {
    batches.push(operations.slice(index, index + batchSize));
  }

  console.log(`Importing ${operations.length} records in ${batches.length} batches...`);

  await commitWrites(accessToken, [
    buildWrite("templates", REGISTRY_PROFILE.templateId, template),
  ]);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const writes = batch.map((record) => buildWrite("documents", record.docId, record.payload));
    await commitWrites(accessToken, writes);
    console.log(`Committed batch ${batchIndex + 1}/${batches.length} (${batch.length} docs)`);
  }

  console.log("Registry import complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
