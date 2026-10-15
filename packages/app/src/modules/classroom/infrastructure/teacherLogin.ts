/**
 * The teacher's one shared password (`TEACHER_PASSWORD`) and the signed
 * cookie a correct login earns. Nothing is stored on the server: the cookie
 * carries its expiry and an HMAC keyed with the password, so changing the
 * password signs everybody out.
 */
const COOKIE = "studyluma-teacher";
const LIFETIME_SECONDS = 60 * 60 * 24 * 7;

type Registry = { password?: string | undefined };

// A global, because the server entry and the bundled app can hold separate
// copies of this module.
const registry: Registry = ((
  globalThis as { __studylumaTeacher?: Registry }
).__studylumaTeacher ??= {});

/** Called by the server hook with the secret from the environment bindings. */
export function configureTeacherPassword(value: string | undefined): void {
  registry.password = value || undefined;
}

/**
 * The configured password, or undefined while the instance has none. The
 * environment is the fallback for the Vite dev server, which runs no hook.
 */
export function teacherPassword(): string | undefined {
  if (registry.password) {
    return registry.password;
  }
  const fromEnvironment =
    typeof process === "undefined" ? undefined : process.env.TEACHER_PASSWORD;
  return fromEnvironment || undefined;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function hmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

async function sign(secret: string, payload: string): Promise<Uint8Array> {
  const key = await hmacKey(secret, ["sign"]);
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payload)),
  );
}

/** Whether the attempt is the password, without leaking how much of it matched. */
export async function passwordMatches(
  password: string,
  attempt: string,
): Promise<boolean> {
  // Both sides become 32 bytes of the same length, whatever was typed
  // (an empty attempt is no key for HMAC, so it is the message instead).
  const [expected, given] = await Promise.all([
    sign("studyluma-login", password),
    sign("studyluma-login", attempt),
  ]);
  let difference = 0;
  for (let index = 0; index < expected.length; index++) {
    difference |= (expected[index] ?? 0) ^ (given[index] ?? 0);
  }
  return difference === 0;
}

const payload = (expires: string) => `teacher.${expires}`;

function secure(request: Request): string {
  const https =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  return https ? "; Secure" : "";
}

/** Set-Cookie value that makes this browser a teacher for a week. */
export async function teacherCookie(
  request: Request,
  password: string,
  now: number = Date.now(),
): Promise<string> {
  const expires = String(Math.floor(now / 1000) + LIFETIME_SECONDS);
  const signature = toBase64Url(await sign(password, payload(expires)));
  return `${COOKIE}=${expires}.${signature}; Path=/; Max-Age=${LIFETIME_SECONDS}; SameSite=Lax; HttpOnly${secure(request)}`;
}

export function clearTeacherCookie(request: Request): string {
  return `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${secure(request)}`;
}

/** Whether the request carries an unexpired cookie signed with this password. */
export async function hasTeacherCookie(
  request: Request,
  password: string,
  now: number = Date.now(),
): Promise<boolean> {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name !== COOKIE || !value) {
      continue;
    }
    const [expires = "", signature = ""] = value.split(".");
    const bytes = fromBase64Url(signature);
    if (!/^\d{1,12}$/.test(expires) || !bytes) {
      return false;
    }
    if (Number(expires) * 1000 <= now) {
      return false;
    }
    const key = await hmacKey(password, ["verify"]);
    return crypto.subtle.verify(
      "HMAC",
      key,
      bytes as BufferSource,
      encoder.encode(payload(expires)),
    );
  }
  return false;
}
