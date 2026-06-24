import { resolveApiBaseUrl } from "./apiBase";

const API_BASE = resolveApiBaseUrl();

async function readJsonResponse<T>(response: Response, context: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) return {} as T;

  if (contentType.includes("application/json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      throw new Error(`${context} returned invalid JSON: ${trimmed.slice(0, 200)}`);
    }
  }

  throw new Error(`${context} returned HTML instead of JSON.`);
}

export function generateTemporaryPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = new Uint32Array(length);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export async function updateAdminUserPassword(uid: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/users/${encodeURIComponent(uid)}/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const err = await readJsonResponse<{ error?: string }>(response, "Update password");
    throw new Error(err.error ?? `Update password failed (${response.status})`);
  }
}
