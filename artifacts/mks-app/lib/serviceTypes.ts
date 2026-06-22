import { LanguageCode, ServiceType } from "@/types";
import { localizedText } from "./i18n";

export const SERVICE_TYPES_COLLECTION = "serviceTypes";

export const DEFAULT_SERVICE_TYPES: Omit<ServiceType, "createdAt" | "updatedAt">[] = [
  {
    id: "Degree Certificate",
    label: "Degree Certificate",
    labelMy: "အောင်လက်မှတ်",
    labelEn: "Degree Certificate",
    active: true,
    sortOrder: 1,
    builtin: true,
  },
  {
    id: "Notary",
    label: "Notary",
    labelMy: "Notary",
    labelEn: "Notary",
    active: true,
    sortOrder: 2,
    builtin: true,
  },
  {
    id: "Transcript",
    label: "Transcript",
    labelMy: "ထောက်ခံစာ / Transcript",
    labelEn: "Transcript",
    active: true,
    sortOrder: 3,
    builtin: true,
  },
  {
    id: "Translation",
    label: "Translation",
    labelMy: "ဘာသာပြန်",
    labelEn: "Translation",
    active: true,
    sortOrder: 4,
    builtin: true,
  },
  {
    id: "Other",
    label: "Other",
    labelMy: "အခြား",
    labelEn: "Other",
    active: true,
    sortOrder: 5,
    builtin: true,
  },
];

export function normalizeServiceTypeLabel(
  language: LanguageCode,
  serviceType?: Partial<ServiceType> | null,
): string {
  if (!serviceType) return "";
  return localizedText(
    language,
    serviceType.label,
    serviceType.labelMy,
    serviceType.labelEn,
  );
}

function normalizeServiceTypeKey(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function resolveServiceTypeId(value?: string | null, serviceTypes: ServiceType[] = []): string {
  const normalizedValue = normalizeServiceTypeKey(value);
  if (!normalizedValue) return "";

  const matched =
    serviceTypes.find((serviceType) =>
      [serviceType.id, serviceType.label, serviceType.labelMy, serviceType.labelEn]
        .filter(Boolean)
        .some((candidate) => normalizeServiceTypeKey(candidate) === normalizedValue),
    ) ??
    DEFAULT_SERVICE_TYPES.find((serviceType) =>
      [serviceType.id, serviceType.label, serviceType.labelMy, serviceType.labelEn]
        .filter(Boolean)
        .some((candidate) => normalizeServiceTypeKey(candidate) === normalizedValue),
    );

  return matched?.id ?? String(value).trim();
}

export function getServiceTypeLabelFromValue(
  language: LanguageCode,
  value: string,
  serviceTypes: ServiceType[] = [],
): string {
  const normalizedValue = normalizeServiceTypeKey(value);
  const matched = serviceTypes.find((serviceType) =>
    [serviceType.id, serviceType.label, serviceType.labelMy, serviceType.labelEn]
      .filter(Boolean)
      .some((candidate) => normalizeServiceTypeKey(candidate) === normalizedValue),
  );
  if (matched) return normalizeServiceTypeLabel(language, matched);
  const fallback = DEFAULT_SERVICE_TYPES.find((serviceType) =>
    [serviceType.id, serviceType.label, serviceType.labelMy, serviceType.labelEn]
      .filter(Boolean)
      .some((candidate) => normalizeServiceTypeKey(candidate) === normalizedValue),
  );
  if (fallback) return normalizeServiceTypeLabel(language, fallback);
  return value;
}

export function getActiveServiceTypes(serviceTypes: ServiceType[]) {
  return serviceTypes.filter((serviceType) => serviceType.active);
}

export function sortServiceTypes(serviceTypes: ServiceType[]) {
  return [...serviceTypes].sort((a, b) => {
    const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return normalizeServiceTypeLabel("en", a).localeCompare(normalizeServiceTypeLabel("en", b));
  });
}

export function createServiceTypeId(labelEn: string, labelMy: string) {
  const source = (labelEn || labelMy || "").trim();
  const slug = source
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `custom-${Date.now()}`;
}
