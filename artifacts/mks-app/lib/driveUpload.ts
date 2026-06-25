import { resolveDriveApiBaseUrl } from "./apiBase";

const API_BASE = resolveDriveApiBaseUrl();

export interface DriveUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
}

export interface DriveHealthResult {
  status: string;
  configured: boolean;
  folderConfigured: boolean;
}

export interface DriveHealthState extends DriveHealthResult {
  apiConfigured: boolean;
}

export interface DriveSearchResult {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  thumbnailLink?: string;
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

export function extractDriveFileId(value?: string): string {
  const input = value?.trim();
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

export function normalizeDriveFileUrl(value?: string): string {
  const input = value?.trim();
  if (!input) return "";
  const driveFileId = extractDriveFileId(input);
  if (!driveFileId) return input;
  return input.includes("drive.google.com")
    ? input
    : `https://drive.google.com/open?id=${driveFileId}`;
}

export function buildDrivePreviewUrl(value?: string): string {
  if (!isDriveApiConfigured()) return "";
  const driveFileId = extractDriveFileId(value);
  if (!driveFileId) return "";
  return `${API_BASE}/drive/files/${driveFileId}/preview`;
}

export function buildDrivePreviewPageUrl(value?: string): string {
  const driveFileId = extractDriveFileId(value);
  if (!driveFileId) return "";
  return `https://drive.google.com/file/d/${driveFileId}/preview`;
}

export function buildDriveThumbnailUrl(value?: string, size = 1200): string {
  const driveFileId = extractDriveFileId(value);
  if (!driveFileId) return "";
  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w${size}`;
}

export function buildDriveFullImageUrl(value?: string): string {
  const driveFileId = extractDriveFileId(value);
  if (!driveFileId) return "";
  return `https://drive.google.com/uc?export=view&id=${driveFileId}`;
}

export function buildDriveDownloadUrl(value?: string): string {
  const driveFileId = extractDriveFileId(value);
  if (!driveFileId) return "";
  return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

function apiHostHint() {
  if (typeof window === "undefined") return "";
  try {
    const driveBaseOrigin = new URL(API_BASE, window.location.origin).origin;
    if (driveBaseOrigin === window.location.origin) {
      return " The request is reaching the web app host instead of the Drive API host. Set EXPO_PUBLIC_DRIVE_API_BASE_URL to the deployed Drive API server.";
    }
  } catch {
    return "";
  }
  return "";
}

function isDriveApiConfigured() {
  if (typeof window === "undefined") return true;
  try {
    if (process.env.EXPO_PUBLIC_DRIVE_API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL) return true;
    return isLocalhost(window.location.hostname);
  } catch {
    return false;
  }
}

function isLocalhost(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "[::1]";
}

function requireDriveApiConfigured(context: string) {
  if (isDriveApiConfigured()) return;
  throw new Error(
    `${context} is not configured yet. Set EXPO_PUBLIC_DRIVE_API_BASE_URL to a deployed Drive API server before using Google Drive features.`,
  );
}

export function canUseDriveApi() {
  return isDriveApiConfigured();
}

async function readJsonResponse<T>(
  response: Response,
  context: string,
): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    return {} as T;
  }

  if (
    contentType.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      return JSON.parse(trimmed) as T;
    } catch (error) {
      throw new Error(
        `${context} returned invalid JSON: ${trimmed.slice(0, 200)}`,
      );
    }
  }

  const preview = trimmed.replace(/\s+/g, " ").slice(0, 200);
  throw new Error(
    `${context} returned HTML instead of JSON.${apiHostHint()} Response preview: ${preview}`,
  );
}

export async function uploadDocumentToDrive(
  doc: DriveUploadInput,
): Promise<DriveUploadResult> {
  requireDriveApiConfigured("Google Drive upload");
  const response = await fetch(`${API_BASE}/drive/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      documentId: doc.documentId,
      title: doc.title,
      studentName: doc.studentName,
      school: doc.school,
      serviceType: doc.serviceType,
      academicYear: doc.academicYear,
      agent: doc.agent,
      date: doc.date,
      templateName: doc.templateName,
      fields: doc.fields,
      notes: doc.notes,
    }),
  });

  if (!response.ok) {
    const err = await readJsonResponse<{ error?: string; details?: unknown }>(
      response,
      "Drive upload",
    );
    throw new Error(err.error ?? `Drive upload failed (${response.status})`);
  }

  return readJsonResponse<DriveUploadResult>(response, "Drive upload");
}

export async function isDriveAvailable(): Promise<boolean> {
  try {
    const data = await getDriveHealth();
    return !!data.apiConfigured && !!data.configured;
  } catch {
    return false;
  }
}

export async function getDriveHealth(): Promise<DriveHealthState> {
  if (!isDriveApiConfigured()) {
    return {
      status: "unavailable",
      configured: false,
      folderConfigured: false,
      apiConfigured: false,
    };
  }

  const res = await fetch(`${API_BASE}/drive/health`);
  if (!res.ok) {
    const err = await readJsonResponse<{ error?: string }>(res, "Drive health");
    throw new Error(err.error ?? `Drive health failed (${res.status})`);
  }

  const data = await readJsonResponse<DriveHealthResult>(res, "Drive health");
  return {
    ...data,
    apiConfigured: true,
  };
}

export function classifyDriveUploadError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("expose_public_api_base_url") ||
    normalized.includes("backend api server")
  ) {
    return { kind: "api-not-configured" as const, message };
  }

  if (
    normalized.includes("google drive is not configured") ||
    normalized.includes("not yet connected")
  ) {
    return { kind: "missing-connector" as const, message };
  }

  return { kind: "generic" as const, message };
}

export async function searchDriveFiles(
  query: string,
): Promise<DriveSearchResult[]> {
  requireDriveApiConfigured("Google Drive search");
  const res = await fetch(
    `${API_BASE}/drive/search?q=${encodeURIComponent(query)}`,
  );
  if (!res.ok) {
    const err = await readJsonResponse<{ error?: string }>(res, "Drive search");
    throw new Error(err.error ?? `Drive search failed (${res.status})`);
  }
  const data = (await readJsonResponse<{ results?: DriveSearchResult[] }>(
    res,
    "Drive search",
  )) as { results?: DriveSearchResult[] };
  return data.results ?? [];
}
