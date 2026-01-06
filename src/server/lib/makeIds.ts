export type SubjectKeyParts = {
  group: string;
  year?: number;
  subject: string;
  variant?: string;
};

export function makeGroupKey({ group, year }: Pick<SubjectKeyParts, "group" | "year">) {
  return `${group}${year !== undefined ? String(year) : ""}`;
}

export function makeSubjectKey({ subject, variant }: Pick<SubjectKeyParts, "subject" | "variant">) {
  return `${subject}${variant ? `-${variant}` : ""}`;
}

export function makeCourseId(c: SubjectKeyParts) {
  return `${makeGroupKey(c)}-${makeSubjectKey(c)}`;
}

export function makeCourseSlug(c: SubjectKeyParts) {
  return `/${makeGroupKey(c)}/${makeSubjectKey(c)}`;
}