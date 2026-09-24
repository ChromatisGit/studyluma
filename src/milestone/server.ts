import { createSessionManager, type User } from "@chromatis/base/auth";
import { createDatabase, type Database } from "@chromatis/base/database";
import { redirect } from "react-router";

let database: Database | undefined;

export function getDatabase(): Database {
  if (database) return database;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  database = createDatabase(url, {
    runtime: process.env.DB_RUNTIME === "cloudflare" ? "cloudflare" : "bun",
    environment: "production",
  });
  return database;
}

let sessionManager: ReturnType<typeof createSessionManager> | undefined;
export function getSessionManager() {
  sessionManager ??= createSessionManager({
    database: getDatabase(),
    cookieName: "studyluma-session",
    secure: process.env.NODE_ENV === "production",
  });
  return sessionManager;
}

export async function requireSignedIn(request: Request): Promise<User> {
  const session = await getSessionManager().resolve(request);
  if (!session) throw redirect(`/login?from=${encodeURIComponent(new URL(request.url).pathname)}`);
  return session.user;
}

export function notFound(): never { throw new Response("Not found", { status: 404 }); }
