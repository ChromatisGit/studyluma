export function removeIndent(text: string, indent: number): string {
    if (indent <= 0) return text;
    const pattern = new RegExp(`^ {0,${indent}}`, "gm");
    return text.replace(pattern, "");
}