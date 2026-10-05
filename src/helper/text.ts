/**
 * Fills `{name}` placeholders in a text from a `*.de.json` file.
 * Unknown placeholders stay visible so a missing value is noticed.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

/** Picks the singular or plural form of `{ one, other }` texts. */
export function plural(
  forms: { one: string; other: string },
  count: number,
): string {
  return fill(count === 1 ? forms.one : forms.other, { count });
}
