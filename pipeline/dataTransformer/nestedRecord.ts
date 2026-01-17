export type NestedRecord<Keys extends readonly PropertyKey[], Leaf> =
  Keys extends readonly [infer K extends PropertyKey, ...infer Rest extends PropertyKey[]]
    ? Record<K, NestedRecord<Rest, Leaf>>
    : Leaf;

type MutableRecord = Record<PropertyKey, unknown>;

export function ensurePath<
  Obj extends MutableRecord,
  const Keys extends readonly PropertyKey[]
>(
  obj: Obj,
  ...keys: Keys
): MutableRecord {
  let cur: MutableRecord = obj;
  for (const key of keys) {
    const next = cur[key];
    if (next && typeof next === "object") {
      cur = next as MutableRecord;
      continue;
    }
    const created: MutableRecord = {};
    cur[key] = created;
    cur = created;
  }
  return cur;
}
