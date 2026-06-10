import type { LanguageCode, Document, TemplateField } from "@/types";

const MY_DIGITS = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];

export const REGISTRY_FIELD_DEFINITIONS = [
  { id: "index", labelMy: "စဉ်", labelEn: "Index", type: "number" },
  { id: "seatPrefix", labelMy: "ခုံ", labelEn: "Seat Prefix", type: "text" },
  { id: "certificateNo", labelMy: "အမှတ်", labelEn: "Certificate No.", type: "text" },
  { id: "year", labelMy: "ခုနှစ်", labelEn: "Year", type: "number" },
  { id: "name", labelMy: "အမည်", labelEn: "Name", type: "text" },
  { id: "fatherName", labelMy: "အဖအမည်", labelEn: "Father Name", type: "text" },
  { id: "township", labelMy: "မြို့နယ်", labelEn: "Township", type: "text" },
  { id: "submittedBy", labelMy: "အပ်နှံသူ", labelEn: "Submitted By", type: "text" },
  { id: "submittedDate", labelMy: "အပ်နှံ ရက်စွဲ", labelEn: "Submitted Date", type: "date" },
  { id: "receivedDate", labelMy: "ရရှိ ရက်စွဲ", labelEn: "Received Date", type: "date" },
  { id: "returnedDate", labelMy: "ပြန်ပို့ ရက်စွဲ", labelEn: "Returned Date", type: "date" },
  { id: "issuedBy", labelMy: "ထုတ်ပေးသူ", labelEn: "Issued By", type: "text" },
  { id: "notes", labelMy: "မှတ်ချက်", labelEn: "Notes", type: "textarea" },
] as const;

const REGISTRY_LABELS: Record<string, { my: string; en: string }> = Object.fromEntries(
  REGISTRY_FIELD_DEFINITIONS.map((field) => [field.id, { my: field.labelMy, en: field.labelEn }])
) as Record<string, { my: string; en: string }>;

export const REGISTRY_FIELD_ORDER = REGISTRY_FIELD_DEFINITIONS.map((field) => field.id);

export function isRegistryDocument(document: Pick<Document, "templateId" | "serviceType" | "fields" | "title" | "studentName" | "index" | "seatPrefix" | "certificateNo" | "year">) {
  if (document.templateId === "registry-2025-certificate") return true;
  if (document.serviceType === "Degree Certificate" && (document.fields?.seatPrefix || document.fields?.certificateNo || document.index || document.seatPrefix || document.certificateNo)) {
    return true;
  }
  return Boolean(
    document.fields?.index ||
      document.fields?.seatPrefix ||
      document.fields?.certificateNo ||
      document.index ||
      document.seatPrefix ||
      document.certificateNo ||
      document.year,
  );
}

export function getRegistryFieldOrder() {
  return REGISTRY_FIELD_ORDER;
}

export function getRegistryFieldDefinitions() {
  return [...REGISTRY_FIELD_DEFINITIONS];
}

export function getRegistryDocumentFieldValue(document: Partial<Document>, fieldId: string) {
  const direct = (document as Record<string, unknown>)[fieldId];
  if (direct !== undefined && direct !== null && String(direct).trim()) {
    return String(direct);
  }
  return normalizeText(document.fields?.[fieldId]);
};

function normalizeText(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text;
}

export interface RegistryDocumentLike {
  title?: string;
  studentName?: string;
  name?: string;
  academicYear?: string;
  year?: string;
  seatPrefix?: string;
  seatNo?: string;
  seatNumber?: string;
  certificateNo?: string;
  fields?: Record<string, string>;
}

export function localizeDigits(value: string | number | null | undefined, language: LanguageCode) {
  const text = normalizeText(value);
  if (!text || language === "en") return text;
  return text.replace(/\d/g, (digit) => MY_DIGITS[Number(digit)] ?? digit);
}

export function getRegistrySeatNumber(document: RegistryDocumentLike) {
  const seatPrefix = normalizeText(document.seatPrefix ?? document.seatNo ?? document.fields?.seatPrefix);
  const certificateNo = normalizeText(document.certificateNo ?? document.fields?.certificateNo);

  if (!seatPrefix && !certificateNo) return "";
  if (!seatPrefix) return certificateNo;
  if (!certificateNo) return seatPrefix;
  if (seatPrefix.includes(certificateNo)) return seatPrefix;
  return `${seatPrefix} ${certificateNo}`.trim();
}

export function getRegistryDisplayTitle(document: RegistryDocumentLike, language: LanguageCode) {
  const seatNumber = localizeDigits(getRegistrySeatNumber(document), language);
  const year = localizeDigits(normalizeText(document.year ?? document.academicYear ?? document.fields?.year), language);
  const studentName = normalizeText(document.studentName ?? document.fields?.name ?? document.name);

  const prefix = [seatNumber, year ? `(${year})` : ""].filter(Boolean).join(" ").trim();
  const title = [prefix, studentName].filter(Boolean).join(" - ").trim();
  return title || normalizeText(document.title) || studentName;
}

export function getRegistryFieldLabel(
  fieldId: string,
  language: LanguageCode,
  templateField?: Pick<TemplateField, "label" | "labelMy" | "labelEn">,
) {
  if (templateField) {
    return language === "en"
      ? templateField.labelEn || templateField.labelMy || templateField.label
      : templateField.labelMy || templateField.label || templateField.labelEn || templateField.label;
  }

  const fallback = REGISTRY_LABELS[fieldId];
  if (fallback) return language === "en" ? fallback.en : fallback.my;
  return fieldId;
}

export function getRegistryFieldValue(value: unknown, language: LanguageCode) {
  return localizeDigits(normalizeText(value), language);
}
