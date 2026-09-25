import { createSessionManager, type User } from "@chromatis/base/auth";
import { createDatabase, type Database } from "@chromatis/base/database";
import { createBunRuntime, type Runtime } from "@chromatis/base/runtime";
import { redirect } from "react-router";
import type { AppLoadContext } from "react-router";
import { getWebsiteConfig } from "../app/config";
import { websiteEnvironment } from "../app/config/config";
import { databaseUrlSecret, migrationUrlSecret, requireWebsiteSecret } from "../app/config/secrets";

export type WebsiteLoadContext = AppLoadContext & { runtime?: Runtime };

export function getRuntime(context: WebsiteLoadContext = {}): Runtime {
  if (context.runtime) {
    return context.runtime;
  }
  return createBunRuntime({
    ...process.env,
    NODE_ENV: websiteEnvironment(process.env.NODE_ENV),
  });
}

let cachedServices: {
  key: string;
  database: Database;
  sessionManager: ReturnType<typeof createSessionManager>;
} | undefined;

function getServices(context: WebsiteLoadContext = {}) {
  const runtime = getRuntime(context);
  const config = getWebsiteConfig(runtime.environment);
  const url = requireWebsiteSecret(databaseUrlSecret, runtime.secrets);
  const migrationUrl = runtime.environment === "production"
    ? undefined
    : requireWebsiteSecret(migrationUrlSecret, runtime.secrets);
  const key = JSON.stringify([runtime.target, runtime.environment, url, migrationUrl, config.sessionCookieName, config.secureCookies]);
  if (cachedServices?.key === key) {
    return cachedServices;
  }
  const database = createDatabase(url, {
    runtime: runtime.target,
    environment: runtime.environment,
    ...(migrationUrl ? { migrationConnectionString: migrationUrl } : {}),
  });
  const sessionManager = createSessionManager({
    database,
    cookieName: config.sessionCookieName,
    secure: config.secureCookies,
  });
  cachedServices = { key, database, sessionManager };
  return cachedServices;
}

export function getDatabase(context: WebsiteLoadContext = {}): Database {
  return getServices(context).database;
}

export function getSessionManager(context: WebsiteLoadContext = {}) {
  return getServices(context).sessionManager;
}

export async function requireSignedIn(request: Request, context: WebsiteLoadContext = {}): Promise<User> {
  const session = await getSessionManager(context).resolve(request);
  if (!session) {
    throw redirect(`/login?from=${encodeURIComponent(new URL(request.url).pathname)}`);
  }
  return session.user;
}

export function notFound(): never { throw new Response("Not found", { status: 404 }); }
