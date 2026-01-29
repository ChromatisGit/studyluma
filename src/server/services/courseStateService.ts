import "server-only";

import { updateCourseProgress, getCourse, setRegistrationOpenUntil } from "@repo/courseRepo";
import { insertAuditLog } from "@repo/auditRepo";
import type { CourseId } from "./courseService";

export async function setCourseProgress(courseId: CourseId, topicId: string, chapterId: string): Promise<void> {
    // Assumes seeded course exists
    await updateCourseProgress(courseId, topicId, chapterId);
}

export async function getCourseProgress(courseId: CourseId): Promise<{ currentTopicId: string; currentChapterId: string }> {
    const course = await getCourse(courseId);
    if (!course) {
        throw new Error("Course not found");
    }
    const { currentTopicId, currentChapterId } = course;
    return { currentTopicId, currentChapterId };
}

/**
 * Open registration: now + 15 minutes.
 * DB downtime must fail closed (throw generic / treat as unavailable).
 */
export async function openRegistration(courseId: CourseId, userId: string | null = null, ip: string): Promise<Date> {
    const openUntil = new Date(Date.now() + 15 * 60 * 1000);
    await setRegistrationOpenUntil(courseId, openUntil);

    // Audit is best-effort (don't break action if audit fails)
    try {
        await insertAuditLog({
            ip,
            userId,
            action: "openRegistration",
            courseId
        });
    } catch (e) {
        console.error("[Audit] Failed to log openRegistration:", e);
    }

    return openUntil;
}

export async function closeRegistration(courseId: CourseId): Promise<void> {
    await setRegistrationOpenUntil(courseId, null);
}

/**
 * Fail closed: DB errors => null
 */
export async function getRegistrationWindow(courseId: CourseId): Promise<string | null> {
    try {
        const course = await getCourse(courseId);
        if (!course?.registrationOpenUntil) return null;

        const now = Date.now();
        const openUntil = new Date(course.registrationOpenUntil).getTime();
        if (now >= openUntil) return null;

        return new Date(course.registrationOpenUntil).toISOString();
    } catch (error) {
        console.error("[Course] Failed to get registration window:", error);
        return null;
    }
}

/**
 * Fail closed: DB errors => false (since getRegistrationWindow fails to null)
 */
export async function isRegistrationOpen(courseId: CourseId): Promise<boolean> {
    return Boolean(await getRegistrationWindow(courseId));
}

