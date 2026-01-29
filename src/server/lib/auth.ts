import "server-only";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "sn-session";

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
