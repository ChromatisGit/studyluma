import "server-only";

type RegistrationWindowState = {
  defaultOpen: boolean;
  perCourseOpen: Record<string, boolean>;
};

const REGISTRATION_WINDOW: RegistrationWindowState = {
  defaultOpen: false,
  perCourseOpen: {},
};

export function isRegistrationOpen(courseId: string): boolean {
  // TODO: Mock registration window state. Replace with a timed admin toggle stored in the DB.
  return REGISTRATION_WINDOW.perCourseOpen[courseId] ?? REGISTRATION_WINDOW.defaultOpen;
}
