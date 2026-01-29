import { existsSync } from "fs";
import { join } from "path";
import * as argon2 from "argon2";
import { readFile, writeFile } from "./io";

const DEV_ADMIN_ACCESS_CODE = "dev";
const DEV_ADMIN_PIN = "dev";
const DEV_ADMIN_ID = "admin-dev";

const DATA_DIR = join(process.cwd(), ".data");
const USERS_FILE = join(DATA_DIR, "users.json");

type DevUserRecord = {
    id: string;
    role: "admin" | "user";
    groupKey: string | null;
    accessCode: string;
    pinHash: string;
};

async function readUsers(): Promise<DevUserRecord[]> {
    if (!existsSync(USERS_FILE)) {
        await writeFile(USERS_FILE, JSON.stringify([], null, 2));
        return [];
    }

    const content = await readFile(USERS_FILE);
    return JSON.parse(content) as DevUserRecord[];
}

async function writeUsers(users: DevUserRecord[]): Promise<void> {
    await writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

export async function ensureDevAdminUser(): Promise<void> {
    if (process.env.NODE_ENV === "production") return;

    const users = await readUsers();
    const index = users.findIndex((u) => u.accessCode === DEV_ADMIN_ACCESS_CODE);

    if (index === -1) {
        const pinHash = await argon2.hash(DEV_ADMIN_PIN, { type: argon2.argon2id });
        users.push({
            id: DEV_ADMIN_ID,
            role: "admin",
            groupKey: null,
            accessCode: DEV_ADMIN_ACCESS_CODE,
            pinHash,
        });
        await writeUsers(users);
        console.log(`[builder] Seeded dev admin user (${DEV_ADMIN_ACCESS_CODE}/${DEV_ADMIN_PIN})`);
        return;
    }

    const existing = users[index];
    const pinMatches = await argon2
        .verify(existing.pinHash, DEV_ADMIN_PIN)
        .catch(() => false);
    const needsUpdate =
        existing.role !== "admin" ||
        existing.groupKey !== null ||
        existing.accessCode !== DEV_ADMIN_ACCESS_CODE ||
        !pinMatches;

    if (!needsUpdate) return;

    const pinHash = pinMatches
        ? existing.pinHash
        : await argon2.hash(DEV_ADMIN_PIN, { type: argon2.argon2id });

    users[index] = {
        id: existing.id || DEV_ADMIN_ID,
        role: "admin",
        groupKey: null,
        accessCode: DEV_ADMIN_ACCESS_CODE,
        pinHash,
    };
    await writeUsers(users);
    console.log(`[builder] Seeded dev admin user (${DEV_ADMIN_ACCESS_CODE}/${DEV_ADMIN_PIN})`);
}
