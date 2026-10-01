import { createSessionManager, type User } from "@chromatis/base/auth";
import { createDatabase, type Database } from "@chromatis/base/database";
import { createBunRuntime, type Runtime } from "@chromatis/base/runtime";
import { createContext, redirect, RouterContextProvider } from "react-router";
import type { AppLoadContext } from "react-router";
import { getWebsiteConfig } from "./config";
import { websiteEnvironment } from "./config/config";
import {
  databaseUrlSecret,
  migrationUrlSecret,
  requireWebsiteSecret,
} from "./config/secrets";

export const runtimeContext = createContext<Runtime | null>(null);

export type WebsiteLoadContext =
  | RouterContextProvider
  | (AppLoadContext & { runtime?: Runtime });

export function getRuntime(context: WebsiteLoadContext = {}): Runtime {
  const runtime =
    context instanceof RouterContextProvider
      ? context.get(runtimeContext)
      : context.runtime;
  if (runtime) {
    return runtime;
  }
  return createBunRuntime({
    ...process.env,
    NODE_ENV: websiteEnvironment(process.env.NODE_ENV),
  });
}

let cachedServices:
  | {
      key: string;
      database: Database;
      sessionManager: ReturnType<typeof createSessionManager>;
    }
  | undefined;

function getServices(context: WebsiteLoadContext = {}) {
  const runtime = getRuntime(context);
  const config = getWebsiteConfig(runtime.environment);
  const url = requireWebsiteSecret(databaseUrlSecret, runtime.secrets);
  const migrationUrl =
    runtime.environment === "production"
      ? undefined
      : requireWebsiteSecret(migrationUrlSecret, runtime.secrets);
  const key = JSON.stringify([
    runtime.target,
    runtime.environment,
    url,
    migrationUrl,
    config.sessionCookieName,
    config.secureCookies,
  ]);
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

export function hasSessionCookie(
  request: Request,
  context: WebsiteLoadContext = {},
): boolean {
  const cookieName = getWebsiteConfig(
    getRuntime(context).environment,
  ).sessionCookieName;
  return (request.headers.get("cookie") ?? "")
    .split(";")
    .some((part) => part.trimStart().startsWith(`${cookieName}=`));
}

export async function requireSignedIn(
  request: Request,
  context: WebsiteLoadContext,
  url: URL,
): Promise<User> {
  const session = hasSessionCookie(request, context)
    ? await getSessionManager(context).resolve(request)
    : null;
  if (!session) {
    throw redirect(`/login?from=${encodeURIComponent(url.pathname)}`);
  }
  return session.user;
}

export function notFound(): never {
  throw new Response("Not found", { status: 404 });
}
