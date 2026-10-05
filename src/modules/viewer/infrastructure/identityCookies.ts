/**
 * Stand-ins until there are accounts: a random id per browser marks one
 * student, and an optional room keeps separate demo visitors apart.
 */
const PARTICIPANT = "studyluma-participant";
const ROOM = "studyluma-room";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, value] = part.trim().split("=");
    if (key === name && value && /^[\w-]{1,64}$/.test(value)) {
      return value;
    }
  }
  return undefined;
}

/** The student behind this request, or a new one with its Set-Cookie value. */
export function readParticipant(request: Request): {
  id: string;
  setCookie?: string;
} {
  const id = readCookie(request, PARTICIPANT);
  if (id) {
    return { id };
  }
  const fresh = crypto.randomUUID();
  return {
    id: fresh,
    setCookie: `${PARTICIPANT}=${fresh}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax; HttpOnly`,
  };
}

/** The class room; everyone without one shares the course ("" = default). */
export function readRoom(request: Request): string {
  return readCookie(request, ROOM) ?? "";
}

/** Set-Cookie value that puts this browser in its own room. */
export function roomCookie(room: string = crypto.randomUUID()): string {
  return `${ROOM}=${room}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax; HttpOnly`;
}
