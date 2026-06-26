import { Document } from "@/types";

export type DocumentSortMode =
  | "updated-desc"
  | "updated-asc"
  | "name-asc"
  | "name-desc"
  | "year-desc"
  | "year-asc"
  | "seat-asc"
  | "template-order";

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseYear(value: unknown) {
  const text = normalizeText(value);
  const match = text.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

function parseDateValue(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function seatKey(document: Document) {
  const prefix = normalizeText(document.seatPrefix ?? document.seatNo ?? document.seatNumber);
  const number = normalizeText(document.certificateNo);
  return {
    prefix: prefix.toLocaleLowerCase(),
    number: number ? Number(number.replace(/[^\d]/g, "")) || number.toLocaleLowerCase() : "",
  };
}

function nameKey(document: Document) {
  return normalizeText(document.studentName || document.title || document.fields?.name).toLocaleLowerCase();
}

function yearKey(document: Document) {
  return parseYear(document.year ?? document.academicYear) ?? 0;
}

function dateKey(document: Document) {
  return (
    parseDateValue(document.updatedAt) ??
    parseDateValue(document.date) ??
    parseDateValue(document.createdAt) ??
    0
  );
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right, "en", { sensitivity: "base", numeric: true });
}

function compareSeat(left: Document, right: Document) {
  const leftSeat = seatKey(left);
  const rightSeat = seatKey(right);
  const prefixCompare = compareStrings(leftSeat.prefix, rightSeat.prefix);
  if (prefixCompare !== 0) return prefixCompare;
  const leftNumber = typeof leftSeat.number === "number" ? leftSeat.number : Number.POSITIVE_INFINITY;
  const rightNumber = typeof rightSeat.number === "number" ? rightSeat.number : Number.POSITIVE_INFINITY;
  if (leftNumber !== rightNumber) return leftNumber - rightNumber;
  return compareStrings(String(leftSeat.number), String(rightSeat.number));
}

export function compareDocumentsByMode(left: Document, right: Document, mode: DocumentSortMode): number {
  switch (mode) {
    case "updated-asc":
      return dateKey(left) - dateKey(right);
    case "updated-desc":
      return dateKey(right) - dateKey(left);
    case "name-asc":
      return compareStrings(nameKey(left), nameKey(right));
    case "name-desc":
      return compareStrings(nameKey(right), nameKey(left));
    case "year-asc":
      return yearKey(left) - yearKey(right);
    case "year-desc":
      return yearKey(right) - yearKey(left);
    case "seat-asc":
      return compareSeat(left, right);
    default:
      return 0;
  }
}

export function sortDocuments(documents: Document[], mode: DocumentSortMode): Document[] {
  return [...documents].sort((left, right) => compareDocumentsByMode(left, right, mode));
}
