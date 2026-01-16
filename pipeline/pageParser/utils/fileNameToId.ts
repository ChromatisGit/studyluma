/**
 * Convert a filename (or any string) into a URL-safe id:
 * - lowercase
 * - only a-z, 0-9 and -
 * - removes file extension (last .segment)
 */
export function fileNameToId(filename: string): string {
  const base = filename
    .trim()
    .split(/[\\/]/).pop() ?? "";

  const withoutExt = base.replace(/\.[^.]+$/, "");

  // German-friendly transliteration
  const normalized = withoutExt
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");

  const id = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return id;
}