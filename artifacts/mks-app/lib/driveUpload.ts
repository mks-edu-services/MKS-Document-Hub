import { Document } from "@/types";

const API_BASE = (() => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  if (typeof window !== "undefined") return "/api";
  return "http://localhost:8080/api";
})();

export interface DriveUploadResult {
  fileId: string;
  fileUrl: string;
  fileName: string;
}

export async function uploadDocumentToDrive(
  doc: Omit<Document, "id" | "createdAt" | "updatedAt"> & { documentId: string }
): Promise<DriveUploadResult> {
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
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `Drive upload failed (${response.status})`);
  }

  return response.json() as Promise<DriveUploadResult>;
}

export async function isDriveAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/healthz`);
    if (!res.ok) return false;
    const testRes = await fetch(`${API_BASE}/drive/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: "__probe__", title: "", studentName: "", serviceType: "" }),
    });
    const data = await testRes.json().catch(() => ({}));
    return testRes.status !== 503;
  } catch {
    return false;
  }
}
