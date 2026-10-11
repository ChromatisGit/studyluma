/**
 * Four-character join codes. A code only locates a Classroom Session; it
 * never authenticates anybody. The alphabet leaves out characters that are
 * easily confused (0/O, 1/I/L, 5/S, 8/B, 2/Z).
 */
export const JOIN_CODE_ALPHABET = "34679ACDEFGHJKMNPQRTUVWXY";
export const JOIN_CODE_LENGTH = 4;

/** `random` fills the array with uniformly random bytes. */
export function generateJoinCode(
  random: (bytes: Uint8Array) => void = (bytes) =>
    void crypto.getRandomValues(bytes),
): string {
  const size = JOIN_CODE_ALPHABET.length;
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % size);
  let code = "";
  const buffer = new Uint8Array(16);
  while (code.length < JOIN_CODE_LENGTH) {
    random(buffer);
    for (const byte of buffer) {
      if (byte < limit && code.length < JOIN_CODE_LENGTH) {
        code += JOIN_CODE_ALPHABET[byte % size];
      }
    }
  }
  return code;
}

/** The canonical code for what a person typed, or null if it can't be one. */
export function normalizeJoinCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return code.length === JOIN_CODE_LENGTH &&
    [...code].every((char) => JOIN_CODE_ALPHABET.includes(char))
    ? code
    : null;
}
