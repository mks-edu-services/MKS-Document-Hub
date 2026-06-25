function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolveApiBaseUrl(): string {
  const explicitApiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicitApiBase) return trimTrailingSlash(explicitApiBase);

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${trimTrailingSlash(domain)}/api`;

  if (typeof window !== "undefined") return "/api";

  return "http://localhost:8080/api";
}

export function resolveDriveApiBaseUrl(): string {
  const explicitDriveApiBase = process.env.EXPO_PUBLIC_DRIVE_API_BASE_URL;
  if (explicitDriveApiBase) return trimTrailingSlash(explicitDriveApiBase);

  const explicitApiBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicitApiBase) return trimTrailingSlash(explicitApiBase);

  return "https://script.google.com/macros/s/AKfycbwSfyGSFqNTgoK38cpZtrrxEz18qH8IEz5GGiaaRyrcSpbCA1boZ_Iy4ZNgJo5L8VP_/exec";
}
