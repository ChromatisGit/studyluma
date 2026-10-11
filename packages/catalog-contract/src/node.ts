/**
 * The Node-compatible built-ins the file checks need. They are fetched when a
 * check runs, not imported, so that browser and Worker bundles which only use
 * the types and the math helpers of this package never see `node:fs`.
 */
export function nodeBuiltins() {
  const load =
    typeof process === "undefined" ? undefined : process.getBuiltinModule;
  if (typeof load !== "function") {
    throw new Error(
      "The catalog file checks need a Node-compatible runtime (Node, Bun)",
    );
  }
  return {
    crypto: load("node:crypto"),
    fs: load("node:fs"),
    path: load("node:path"),
  };
}
