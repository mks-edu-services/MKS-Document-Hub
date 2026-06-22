import { Document, ServiceType, Template } from "@/types";
import { compareDocumentsByMode, type DocumentSortMode } from "./documentSorting";
import { resolveServiceTypeId } from "./serviceTypes";

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function compactSearchText(value: unknown) {
  return normalizeSearchText(value).replace(/[\s._\-\/\\,;:()[\]{}'"'"'"!?|]+/g, "");
}

function compareText(left: unknown, right: unknown) {
  return normalizeSearchText(left).localeCompare(normalizeSearchText(right), "en", { sensitivity: "base", numeric: true });
}

function compareValueByType(left: unknown, right: unknown, type?: string) {
  const leftText = normalizeSearchText(left);
  const rightText = normalizeSearchText(right);
  if (!leftText && !rightText) return 0;
  if (!leftText) return 1;
  if (!rightText) return -1;

  if (type === "number") {
    const leftNumber = Number(leftText.replace(/[^\d.-]/g, ""));
    const rightNumber = Number(rightText.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
      return leftNumber - rightNumber;
    }
  }

  if (type === "date") {
    const leftDate = new Date(leftText);
    const rightDate = new Date(rightText);
    if (!Number.isNaN(leftDate.getTime()) && !Number.isNaN(rightDate.getTime()) && leftDate.getTime() !== rightDate.getTime()) {
      return leftDate.getTime() - rightDate.getTime();
    }
  }

  return compareText(leftText, rightText);
}

function compareTemplateValues(left: unknown, right: unknown, type?: string) {
  return compareValueByType(left, right, type);
}

function getDocumentFieldValue(document: Document, fieldId: string) {
  return (document as unknown as Record<string, unknown>)[fieldId];
}

function searchCandidates(document: Document): Array<{ value: unknown; weight: number }> {
  return [
    { value: document.studentName, weight: 0 },
    { value: document.title, weight: 1 },
    { value: document.scanSearchKey, weight: 2 },
    { value: document.scanFileName, weight: 3 },
    { value: document.index, weight: 4 },
    { value: document.seatPrefix, weight: 5 },
    { value: document.seatNo, weight: 6 },
    { value: document.seatNumber, weight: 7 },
    { value: document.certificateNo, weight: 8 },
    { value: document.school, weight: 9 },
    { value: document.agent, weight: 10 },
    { value: document.templateName, weight: 11 },
    { value: document.serviceType, weight: 12 },
    { value: document.fatherName, weight: 13 },
    { value: document.township, weight: 14 },
    { value: document.issuedBy, weight: 15 },
    { value: document.submittedBy, weight: 16 },
    { value: document.notes, weight: 17 },
    ...Object.values(document.fields ?? {}).map((value, index) => ({ value, weight: 100 + index })),
  ];
}

function getSearchRank(document: Document, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);
  if (!normalizedQuery || !compactQuery) return null;

  let best: { bucket: number; position: number; weight: number; length: number } | null = null;

  for (const candidate of searchCandidates(document)) {
    const text = normalizeSearchText(candidate.value);
    const compact = compactSearchText(candidate.value);
    if (!text && !compact) continue;

    let bucket: number | null = null;
    let position = Number.MAX_SAFE_INTEGER;
    const exactText = text === normalizedQuery;
    const exactCompact = compact === compactQuery;
    if (exactText || exactCompact) {
      bucket = 0;
      position = 0;
    } else if (text.startsWith(normalizedQuery) || compact.startsWith(compactQuery)) {
      bucket = 1;
      position = 0;
    } else {
      const textIndex = text.indexOf(normalizedQuery);
      const compactIndex = compact.indexOf(compactQuery);
      const index = textIndex >= 0 ? textIndex : compactIndex;
      if (index >= 0) {
        bucket = 2;
        position = index;
      }
    }

    if (bucket === null) continue;

    const score = { bucket, position, weight: candidate.weight, length: text.length || compact.length };
    if (
      !best ||
      score.bucket < best.bucket ||
      (score.bucket === best.bucket && score.position < best.position) ||
      (score.bucket === best.bucket && score.position === best.position && score.weight < best.weight) ||
      (score.bucket === best.bucket && score.position === best.position && score.weight === best.weight && score.length < best.length)
    ) {
      best = score;
    }
  }

  return best;
}

function compareSearchRanks(left: Document, right: Document, query: string) {
  const leftRank = getSearchRank(left, query);
  const rightRank = getSearchRank(right, query);
  if (!leftRank && !rightRank) return 0;
  if (!leftRank) return 1;
  if (!rightRank) return -1;
  if (leftRank.bucket !== rightRank.bucket) return leftRank.bucket - rightRank.bucket;
  if (leftRank.position !== rightRank.position) return leftRank.position - rightRank.position;
  if (leftRank.weight !== rightRank.weight) return leftRank.weight - rightRank.weight;
  if (leftRank.length !== rightRank.length) return leftRank.length - rightRank.length;
  return 0;
}

function compareByTemplateOrder(left: Document, right: Document, templatesById: Record<string, Template>) {
  const leftTemplate = templatesById[left.templateId];
  const rightTemplate = templatesById[right.templateId];
  const templateNameCompare = compareText(leftTemplate?.name ?? left.templateName, rightTemplate?.name ?? right.templateName);
  if (templateNameCompare !== 0) return templateNameCompare;

  const leftFields = leftTemplate?.fields ?? [];
  const rightFields = rightTemplate?.fields ?? [];
  const maxLength = Math.max(leftFields.length, rightFields.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftField = leftFields[index];
    const rightField = rightFields[index];
    const leftValue = leftField ? left.fields?.[leftField.id] ?? getDocumentFieldValue(left, leftField.id) : "";
    const rightValue = rightField ? right.fields?.[rightField.id] ?? getDocumentFieldValue(right, rightField.id) : "";
    const type = leftField?.type ?? rightField?.type;
    const compare = compareTemplateValues(leftValue, rightValue, type);
    if (compare !== 0) return compare;
  }

  return compareDocumentsByMode(left, right, "updated-desc");
}

export interface DocumentListOrderingOptions {
  query?: string;
  serviceType?: string;
  sortMode?: DocumentSortMode;
  templates?: Template[];
  serviceTypes?: ServiceType[];
}

export function sortDocumentsForList(documents: Document[], options: DocumentListOrderingOptions = {}): Document[] {
  const query = normalizeSearchText(options.query);
  const sortMode = options.sortMode ?? "updated-desc";
  const serviceTypeId = resolveServiceTypeId(options.serviceType, options.serviceTypes ?? []);
  const templatesById = Object.fromEntries((options.templates ?? []).map((template) => [template.id, template]));
  const shouldUseTemplateOrder = Boolean(serviceTypeId && serviceTypeId !== "All");

  return [...documents].sort((left, right) => {
    if (query) {
      const searchCompare = compareSearchRanks(left, right, query);
      if (searchCompare !== 0) return searchCompare;
    }

    if (shouldUseTemplateOrder) {
      const templateCompare = compareByTemplateOrder(left, right, templatesById);
      if (templateCompare !== 0) return templateCompare;
    }

    return compareDocumentsByMode(left, right, sortMode);
  });
}

export function matchesDocumentQuery(document: Document, query: string, serviceTypes: ServiceType[] = []) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const compactQuery = compactSearchText(query);
  return (
    searchCandidates(document).some(({ value }) => {
      const text = normalizeSearchText(value);
      const compact = compactSearchText(value);
      return (
        text.includes(normalizedQuery) ||
        compact.includes(compactQuery)
      );
    })
  );
}
