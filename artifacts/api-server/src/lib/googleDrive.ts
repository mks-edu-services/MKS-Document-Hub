import { google } from "googleapis";
import { readFile } from "node:fs/promises";
import { logger } from "./logger";

const CONNECTORS_HOSTNAME = process.env.REPLIT_CONNECTORS_HOSTNAME;
const REPL_IDENTITY = process.env.REPL_IDENTITY;
const WEB_REPL_RENEWAL = process.env.WEB_REPL_RENEWAL;
const CONNECTION_ID = process.env.GOOGLE_DRIVE_CONNECTION_ID;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

type DriveServiceAccount = {
  client_email: string;
  private_key: string;
};

export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim() ||
    (CONNECTORS_HOSTNAME && CONNECTION_ID)
  );
}

export function getDriveConfigState() {
  return {
    configured: isDriveConfigured(),
    folderConfigured: !!FOLDER_ID,
  };
}

async function getAccessToken(): Promise<string> {
  if (!CONNECTORS_HOSTNAME || !CONNECTION_ID) {
    throw new Error(
      "Google Drive connector not configured. Set GOOGLE_DRIVE_CONNECTION_ID.",
    );
  }

  const url = `https://${CONNECTORS_HOSTNAME}/api/v2/connection/${CONNECTION_ID}/token/access`;
  const headers: Record<string, string> = {};
  if (REPL_IDENTITY) headers["X-Replit-Identity"] = REPL_IDENTITY;
  if (WEB_REPL_RENEWAL) headers["X-Replit-WEB-Identity"] = WEB_REPL_RENEWAL;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to get Drive access token (${response.status}): ${text}`,
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function getServiceAccountAuth() {
  const inlineJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;

  if (inlineJson) {
    let parsed: Partial<DriveServiceAccount>;
    try {
      parsed = JSON.parse(inlineJson) as Partial<DriveServiceAccount>;
    } catch {
      throw new Error(
        "Google Drive service account JSON is invalid. Check GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON.",
      );
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        "Google Drive service account JSON is missing client_email or private_key.",
      );
    }
    return new google.auth.JWT({
      email: parsed.client_email,
      key: parsed.private_key,
      scopes: DRIVE_SCOPES,
    });
  }

  const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (credentialsFile) {
    const raw = await readFile(credentialsFile, "utf8");
    let parsed: Partial<DriveServiceAccount>;
    try {
      parsed = JSON.parse(raw) as Partial<DriveServiceAccount>;
    } catch {
      throw new Error(
        "Google Drive service account file is not valid JSON. Check GOOGLE_APPLICATION_CREDENTIALS.",
      );
    }
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error(
        "Google Drive service account file is missing client_email or private_key.",
      );
    }
    return new google.auth.JWT({
      email: parsed.client_email,
      key: parsed.private_key,
      scopes: DRIVE_SCOPES,
    });
  }

  return null;
}

function getErrorStatus(err: any): number | undefined {
  const status = Number(err?.response?.status ?? err?.status);
  return Number.isFinite(status) ? status : undefined;
}

function isRetryableDriveError(err: any): boolean {
  const status = getErrorStatus(err);
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function retry<T>(
  label: string,
  task: () => Promise<T>,
  attempts = 2,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (err) {
      lastError = err;
      if (attempt < attempts && isRetryableDriveError(err)) {
        const waitMs = 300 * attempt;
        logger.warn(
          { label, attempt, waitMs, err },
          "Retrying Google Drive request",
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

async function getAuthorizedDriveClient() {
  const serviceAccountAuth = await getServiceAccountAuth();
  if (serviceAccountAuth) {
    return google.drive({ version: "v3", auth: serviceAccountAuth });
  }

  const accessToken = await retry("getAccessToken", () => getAccessToken());
  return getDriveClient(accessToken);
}

export interface DriveUploadInput {
  documentId: string;
  title: string;
  studentName: string;
  school?: string;
  serviceType: string;
  academicYear?: string;
  agent?: string;
  date?: string;
  templateName?: string;
  fields?: Record<string, string>;
  notes?: string;
}

export interface DriveSearchResult {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  thumbnailLink?: string;
}

export interface DrivePreviewResult {
  mimeType?: string;
  fileName?: string;
  stream: NodeJS.ReadableStream;
}

function sanitizeFileName(value: string) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHtmlContent(input: DriveUploadInput): string {
  const rows = [
    ["Student Name", input.studentName],
    ["School / Institution", input.school || "—"],
    ["Service Type", input.serviceType],
    ["Academic Year", input.academicYear || "—"],
    ["Agent", input.agent || "—"],
    ["Date", input.date || "—"],
    ["Template", input.templateName || "—"],
  ];

  const baseTable = rows
    .map(
      ([label, value]) =>
        `<tr><td style="font-weight:bold;padding:6px 12px;width:180px;background:#f0f4f8;">${label}</td>` +
        `<td style="padding:6px 12px;">${value}</td></tr>`,
    )
    .join("");

  const extraFields =
    input.fields && Object.keys(input.fields).length > 0
      ? Object.entries(input.fields)
          .filter(([, v]) => v)
          .map(
            ([k, v]) =>
              `<tr><td style="font-weight:bold;padding:6px 12px;background:#f0f4f8;">${k}</td>` +
              `<td style="padding:6px 12px;">${v}</td></tr>`,
          )
          .join("")
      : "";

  const notesSection = input.notes
    ? `<h3 style="color:#003366;">Notes</h3><p style="line-height:1.6;">${input.notes}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #1a2332; }
    h1 { color: #003366; border-bottom: 3px solid #008080; padding-bottom: 8px; }
    h2 { color: #003366; margin-top: 32px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    td { border: 1px solid #dde3ea; vertical-align: top; }
    .footer { margin-top: 48px; font-size: 12px; color: #6b7c93; border-top: 1px solid #dde3ea; padding-top: 12px; }
  </style>
</head>
<body>
  <h1>${input.title}</h1>
  <h2>Document Information</h2>
  <table>${baseTable}${extraFields}</table>
  ${notesSection}
  <div class="footer">
    Generated by MKS Education Service Document Management System &nbsp;|&nbsp;
    ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
  </div>
</body>
</html>`;
}

export interface DriveUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
}

export async function uploadDocumentToDrive(
  input: DriveUploadInput & { title: string },
): Promise<DriveUploadResult> {
  const drive = await getAuthorizedDriveClient();

  const fileName = sanitizeFileName(
    `${input.serviceType} – ${input.studentName} – ${input.date ?? new Date().toISOString().split("T")[0]} – ${input.documentId.slice(0, 8)}`,
  );
  const htmlContent = buildHtmlContent(input);

  logger.info({ fileName }, "Uploading document to Google Drive");

  const createRes = await retry("createDriveFile", async () =>
    drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: "application/vnd.google-apps.document",
        ...(FOLDER_ID ? { parents: [FOLDER_ID] } : {}),
      },
      media: {
        mimeType: "text/html",
        body: (await import("stream")).Readable.from([htmlContent]),
      },
      fields: "id,name",
    }),
  );

  const fileId = createRes.data.id!;

  await retry("shareDriveFile", async () =>
    drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    }),
  );

  const fileUrl = `https://docs.google.com/document/d/${fileId}/edit`;
  logger.info({ fileId, fileUrl }, "Document uploaded to Google Drive");

  return { fileId, fileUrl, fileName: createRes.data.name ?? fileName };
}

export async function searchDriveFiles(
  queryText: string,
): Promise<DriveSearchResult[]> {
  const drive = await getAuthorizedDriveClient();
  const safeQuery = queryText.trim().replace(/'/g, "\\'");
  if (!safeQuery) return [];

  const queryParts = [`name contains '${safeQuery}'`];
  if (FOLDER_ID) {
    queryParts.push(`'${FOLDER_ID}' in parents`);
  }

  const response = await retry("searchDriveFiles", () =>
    drive.files.list({
      q: queryParts.join(" and "),
      pageSize: 10,
      fields: "files(id,name,mimeType,webViewLink,thumbnailLink)",
      orderBy: "modifiedTime desc",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    }),
  );

  return (response.data.files ?? [])
    .filter((file) => !!file.id && !!file.name)
    .map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType ?? undefined,
      webViewLink: file.webViewLink ?? undefined,
      thumbnailLink: file.thumbnailLink ?? undefined,
    }));
}

export async function getDriveFilePreview(
  fileId: string,
): Promise<DrivePreviewResult> {
  const drive = await getAuthorizedDriveClient();

  const metadata = await retry("getDriveFileMetadata", () =>
    drive.files.get({
      fileId,
      fields: "id,name,mimeType",
      supportsAllDrives: true,
    }),
  );

  const media = await retry("getDriveFileMedia", () =>
    drive.files.get(
      {
        fileId,
        alt: "media",
        supportsAllDrives: true,
      },
      { responseType: "stream" },
    ),
  );

  return {
    mimeType: metadata.data.mimeType ?? undefined,
    fileName: metadata.data.name ?? undefined,
    stream: media.data as NodeJS.ReadableStream,
  };
}
