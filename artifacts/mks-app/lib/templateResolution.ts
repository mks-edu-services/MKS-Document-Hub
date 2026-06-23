import type { Document, ServiceType, Template } from "@/types";
import { resolveServiceTypeId } from "./serviceTypes";

function normalizeComparableText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function compactComparableText(value: unknown) {
  return normalizeComparableText(value).replace(/[\s._\-\/\\,;:()[\]{}'"'"'"!?|]+/g, "");
}

function textMatches(left: unknown, right: unknown) {
  const leftText = normalizeComparableText(left);
  const rightText = normalizeComparableText(right);
  if (!leftText || !rightText) return false;
  return leftText === rightText || compactComparableText(leftText) === compactComparableText(rightText);
}

function templateMatchesText(template: Template, text: unknown) {
  if (!text) return false;
  return (
    textMatches(template.id, text) ||
    textMatches(template.name, text) ||
    textMatches(template.nameMy, text) ||
    textMatches(template.nameEn, text)
  );
}

function pickPreferredTemplate(templates: Template[]) {
  if (templates.length === 0) return null;
  return [...templates].sort((left, right) => {
    if (left.active !== right.active) return left.active ? -1 : 1;
    const updatedCompare = String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? ""));
    if (updatedCompare !== 0) return updatedCompare;
    const createdCompare = String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? ""));
    if (createdCompare !== 0) return createdCompare;
    return String(left.name ?? left.id).localeCompare(String(right.name ?? right.id));
  })[0] ?? null;
}

function pickMostUsedTemplate(templates: Template[], documents: Document[]) {
  if (templates.length === 0 || documents.length === 0) return null;

  const templateIdCounts = new Map<string, number>();
  const templateNameCounts = new Map<string, number>();

  for (const document of documents) {
    if (document.templateId) {
      templateIdCounts.set(document.templateId, (templateIdCounts.get(document.templateId) ?? 0) + 1);
    }
    if (document.templateName) {
      templateNameCounts.set(document.templateName, (templateNameCounts.get(document.templateName) ?? 0) + 1);
    }
  }

  const rankedTemplateIds = [...templateIdCounts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });

  for (const [templateId] of rankedTemplateIds) {
    const matched = templates.find((template) => template.id === templateId);
    if (matched) return matched;
  }

  const rankedTemplateNames = [...templateNameCounts.entries()].sort((left, right) => {
    if (right[1] !== left[1]) return right[1] - left[1];
    return left[0].localeCompare(right[0]);
  });

  for (const [templateName] of rankedTemplateNames) {
    const matched = templates.find((template) => templateMatchesText(template, templateName));
    if (matched) return matched;
  }

  return null;
}

export function resolveTemplateForDocument(
  document: Pick<Document, "templateId" | "templateName" | "serviceType"> | null | undefined,
  templates: Template[],
  serviceTypes: ServiceType[] = [],
) {
  if (!document) return null;
  if (document.templateId) {
    const byId = templates.find((template) => template.id === document.templateId);
    if (byId) return byId;
  }

  if (document.templateName) {
    const byName = templates.find((template) => templateMatchesText(template, document.templateName));
    if (byName) return byName;
  }

  const serviceTypeId = resolveServiceTypeId(document.serviceType ?? "", serviceTypes);
  const matchingByService = templates.filter(
    (template) => resolveServiceTypeId(template.serviceType, serviceTypes) === serviceTypeId,
  );
  return pickPreferredTemplate(matchingByService) ?? pickPreferredTemplate(templates);
}

export function resolveTemplateForServiceType(
  serviceTypeValue: string,
  templates: Template[],
  documents: Document[] = [],
  serviceTypes: ServiceType[] = [],
) {
  const serviceTypeId = resolveServiceTypeId(serviceTypeValue, serviceTypes);
  const matching = templates.filter(
    (template) => resolveServiceTypeId(template.serviceType, serviceTypes) === serviceTypeId,
  );
  if (matching.length === 0) return null;

  const documentScoped = pickMostUsedTemplate(
    matching,
    documents.filter((document) => resolveServiceTypeId(document.serviceType, serviceTypes) === serviceTypeId),
  );
  return documentScoped ?? pickPreferredTemplate(matching);
}
