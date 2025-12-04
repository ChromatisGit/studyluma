function fnv1a32(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

// mulberry32 PRNG: returns a function rand() -> number in [0,1)
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPRNG(seed: string): () => number {
  const h = fnv1a32(seed);
  return mulberry32(h);
}

export function deterministicShuffle<T>(
  arr: readonly T[],
  seed: string
): T[] {
  const out = arr.slice();
  const rand = createPRNG(seed);

  for (let i = out.length - 1; i > 0; i--) {
    const r = Math.floor(rand() * (i + 1));
    [out[i], out[r]] = [out[r], out[i]];
  }

  return out;
}
