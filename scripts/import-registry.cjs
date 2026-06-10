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
  const parsed = { dryRun: false, limit: null, resetTemplates: false };
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

function buildTemplateRecord(nowIso) {
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
      sourceWorkbook: path.basename(workbookPath),
      sourceSheet: "2025 အောင်လက်မှတ်",
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
  const indexValue = rawIndex || String(rowIndex);
  const seatNo = [seatPrefix, certificateNo].filter(Boolean).join(" ").trim();

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
      scanFileName: "",
      scanFileUrl: "",
      scanPreviewUrl: "",
      driveSyncError: "",
      driveSyncedAt: "",
      // Preserve a few workbook-specific fields at the top level for quick lookup.
      fatherName,
      submittedDate,
      receivedDate,
      returnedDate,
      issuedBy,
      notes,
    },
  };
}

function parseWorkbook() {
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
    ["-c", pythonScript, workbookPath],
    { encoding: "utf8", maxBuffer: 1024 * 1024 * 16 },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to parse workbook");
  }

  return JSON.parse(result.stdout);
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
  const workbook = parseWorkbook();
  const nowIso = new Date().toISOString();
  const serviceAccount = await loadServiceAccount();
  const template = buildTemplateRecord(nowIso);

  const records = workbook.rows.map((row, index) => buildRegistryDocument(workbook.headers, { values: row }, index + 1, nowIso));
  const limitedRecords = args.limit ? records.slice(0, args.limit) : records;

  console.log(`Workbook: ${path.basename(workbookPath)}`);
  console.log(`Sheet: ${workbook.sheetName}`);
  console.log(`Parsed registry rows: ${records.length}`);
  console.log(`Template ID: ${REGISTRY_PROFILE.templateId}`);

  if (args.dryRun) {
    console.log("Dry run preview:");
    console.log(JSON.stringify({
      template,
      firstRecord: limitedRecords[0],
      count: limitedRecords.length,
    }, null, 2));
    return;
  }

  const accessToken = await getAccessToken(serviceAccount);
  const batchSize = 100;
  const batches = [];
  for (let index = 0; index < limitedRecords.length; index += batchSize) {
    batches.push(limitedRecords.slice(index, index + batchSize));
  }

  console.log(`Importing ${limitedRecords.length} records in ${batches.length} batches...`);

  await commitWrites(accessToken, [
    buildWrite("templates", REGISTRY_PROFILE.templateId, template),
  ]);

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const writes = batch.map((record) => buildWrite("documents", record.docId, record.data));
    await commitWrites(accessToken, writes);
    console.log(`Committed batch ${batchIndex + 1}/${batches.length} (${batch.length} docs)`);
  }

  console.log("Registry import complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
