import "server-only";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "sn-session";
const NEW_CODE_COOKIE_NAME = "sn-new-code";

export async function getSessionCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function setSessionCookie(userId: string) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, userId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
}

/** Set a short-lived cookie carrying the new user's access code for display on the destination page. */
export async function setNewUserCodeCookie(code: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(NEW_CODE_COOKIE_NAME, code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 120,
    });
}

/** Read the new-user code cookie (server components). Use clearNewUserCodeCookie() in an action to delete it. */
export async function getNewUserCodeCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(NEW_CODE_COOKIE_NAME)?.value ?? null;
}

/** Delete the new-user code cookie. Must be called from a Server Action or Route Handler. */
export async function clearNewUserCodeCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(NEW_CODE_COOKIE_NAME);
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
}
