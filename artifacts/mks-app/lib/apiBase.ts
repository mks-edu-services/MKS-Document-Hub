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
