export type UsedCharsets = {
  digits: boolean;
  lowercase: boolean;
  uppercase: boolean;
  symbols: boolean;
};

export type BruteForceEstimate = {
  passwordLength: number;
  charsetSize: number;
  usedCharsets: UsedCharsets;
  combinations: bigint;
  averageSeconds: bigint;
};

const GUESSES_PER_SECOND = 1_000_000_000n;

export function estimateBruteForceTime(password: string): BruteForceEstimate {
  const usedCharsets: UsedCharsets = {
    digits: /[0-9]/.test(password),
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    symbols: /[^a-zA-Z0-9]/.test(password),
  };

  let charsetSize = 0;
  if (usedCharsets.digits) charsetSize += 10;
  if (usedCharsets.lowercase) charsetSize += 26;
  if (usedCharsets.uppercase) charsetSize += 26;
  if (usedCharsets.symbols) charsetSize += 32;

  const passwordLength = password.length;

  if (passwordLength === 0 || charsetSize === 0) {
    return { passwordLength, charsetSize, usedCharsets, combinations: 0n, averageSeconds: 0n };
  }

  const combinations = BigInt(charsetSize) ** BigInt(passwordLength);
  const averageSeconds = combinations / (2n * GUESSES_PER_SECOND);

  return { passwordLength, charsetSize, usedCharsets, combinations, averageSeconds };
}

export function formatDuration(seconds: bigint): string {
  if (seconds < 1n) return "weniger als 1 Sekunde";

  const minute = 60n;
  const hour = 60n * minute;
  const day = 24n * hour;
  const year = 365n * day;

  if (seconds < minute) return `${seconds} Sekunden`;
  if (seconds < hour) return `${seconds / minute} Minuten`;
  if (seconds < day) return `${seconds / hour} Stunden`;
  if (seconds < year) return `${seconds / day} Tage`;
  return `${seconds / year} Jahre`;
}

export function formatBigInt(value: bigint): string {
  const text = value.toString();
  if (text.length <= 12) return text;
  const leadingDigits = text.slice(0, 3);
  const exponent = text.length - 1;
  return `${leadingDigits[0]},${leadingDigits.slice(1)} · 10^${exponent}`;
}
