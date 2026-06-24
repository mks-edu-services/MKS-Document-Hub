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

export function resolveTemplateForDocument(
  document: Pick<Document, "templateId" | "templateName" | "serviceType"> | null | undefined,
  templates: Template[],
  serviceTypes: ServiceType[] = [],
) {
  if (!document) return null;
  if (document.templateName) {
    const byName = templates.find((template) => templateMatchesText(template, document.templateName));
    if (byName) return byName;
  }

  if (document.templateId) {
    const byId = templates.find((template) => template.id === document.templateId);
    if (byId) return byId;
  }

  const serviceTypeId = resolveServiceTypeId(document.serviceType ?? "", serviceTypes);
  const matchingByService = templates.filter(
    (template) => resolveServiceTypeId(template.serviceType, serviceTypes) === serviceTypeId,
  );
  const preferredByService = pickPreferredTemplate(matchingByService);
  if (preferredByService) return preferredByService;

  return pickPreferredTemplate(templates);
}

export function resolveTemplateForServiceType(
  serviceTypeValue: string,
  templates: Template[],
  serviceTypes: ServiceType[] = [],
) {
  const serviceTypeId = resolveServiceTypeId(serviceTypeValue, serviceTypes);
  const matching = templates.filter(
    (template) => resolveServiceTypeId(template.serviceType, serviceTypes) === serviceTypeId,
  );
  if (matching.length === 0) return null;
  return pickPreferredTemplate(matching);
}
