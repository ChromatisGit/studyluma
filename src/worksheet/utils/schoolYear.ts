import { GroupsAndSubjects } from "@schema/groupsAndSubjects";

const SCHOOLYEAR_START_MONTH: Record<GroupsAndSubjects["schoolyear_start"], number> = {
  jan: 0, // January
  feb: 1, // February
  apr: 3, // April
  aug: 7, // August
  sep: 8, // September
};

export function computeSchoolYearId(
  schoolyearStarts: GroupsAndSubjects["schoolyear_start"],
  date: Date = new Date(),
): string {
  const startMonth = SCHOOLYEAR_START_MONTH[schoolyearStarts];
  const year = date.getFullYear();
  const month = date.getMonth(); // 0–11

  const startYear = month >= startMonth ? year : year - 1;
  const endYear = startYear + 1;

  return `${startYear}-${String(endYear).slice(-2)}`; // z.B. "2025-26"
}

