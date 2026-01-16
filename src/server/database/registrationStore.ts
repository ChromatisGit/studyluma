import "server-only";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import type { CourseId } from "../data/courses";

type RegistrationWindow = {
  registrationOpenUntil: string | null; // ISO date string or null
};

const REGISTRATION_DIR = join(process.cwd(), ".data", "registration");
const REGISTRATION_FILE = join(REGISTRATION_DIR, "windows.json");

// In-memory cache
let registrationCache: Map<string, RegistrationWindow> | null = null;

async function ensureRegistrationDir() {
  try {
    await mkdir(REGISTRATION_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function loadRegistrationFromFile(): Promise<Map<string, RegistrationWindow>> {
  try {
    const content = await readFile(REGISTRATION_FILE, "utf-8");
    const data = JSON.parse(content) as Record<string, RegistrationWindow>;
    return new Map(Object.entries(data));
  } catch {
    // File doesn't exist yet, return empty map
    return new Map();
  }
}

async function saveRegistrationToFile(registrationMap: Map<string, RegistrationWindow>): Promise<void> {
  await ensureRegistrationDir();
  const data = Object.fromEntries(registrationMap);
  await writeFile(REGISTRATION_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getRegistrationStore(): Promise<Map<string, RegistrationWindow>> {
  if (!registrationCache) {
    registrationCache = await loadRegistrationFromFile();
  }
  return registrationCache;
}

/**
 * Open the registration window for a course.
 * Sets registrationOpenUntil to 15 minutes from now.
 */
export async function openRegistration(courseId: CourseId): Promise<void> {
  registrationCache = null; // Clear cache

  const store = await getRegistrationStore();
  const openUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  store.set(courseId, {
    registrationOpenUntil: openUntil.toISOString(),
  });

  await saveRegistrationToFile(store);
  registrationCache = null; // Clear cache again
}

/**
 * Close the registration window for a course.
 * Sets registrationOpenUntil to null.
 */
export async function closeRegistration(courseId: CourseId): Promise<void> {
  registrationCache = null; // Clear cache

  const store = await getRegistrationStore();
  store.set(courseId, {
    registrationOpenUntil: null,
  });

  await saveRegistrationToFile(store);
  registrationCache = null; // Clear cache again
}

/**
 * Check if registration is currently open for a course.
 * Registration is open only if:
 * - registrationOpenUntil is not null
 * - current server time is before registrationOpenUntil
 */
export async function isRegistrationOpen(courseId: CourseId): Promise<boolean> {
  const store = await getRegistrationStore();
  const window = store.get(courseId);

  if (!window || !window.registrationOpenUntil) {
    return false;
  }

  const now = Date.now();
  const openUntil = new Date(window.registrationOpenUntil).getTime();

  return now < openUntil;
}

/**
 * Get the registration window status for a course.
 * Returns null if no window is set, or the ISO string if set.
 */
export async function getRegistrationWindow(courseId: CourseId): Promise<string | null> {
  const store = await getRegistrationStore();
  const window = store.get(courseId);
  return window?.registrationOpenUntil ?? null;
}

export function clearRegistrationCache(): void {
  registrationCache = null;
}
