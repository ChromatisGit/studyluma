import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The file a package-exported specifier (`@scope/pkg/sub/path`) names, from the
 * package's `exports` map (exact keys and `*` patterns), or undefined.
 */
export function exportedFile(
  packageRoot: string,
  specifier: string,
): string | undefined {
  const manifest = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  ) as { name: string; exports?: Record<string, unknown> };
  if (!specifier.startsWith(`${manifest.name}/`)) {
    return undefined;
  }
  const subpath = `.${specifier.slice(manifest.name.length)}`;
  for (const [key, target] of Object.entries(manifest.exports ?? {})) {
    if (typeof target !== "string") {
      continue;
    }
    const star = key.indexOf("*");
    if (star < 0 ? key === subpath : subpath.startsWith(key.slice(0, star))) {
      const match = star < 0 ? "" : subpath.slice(star);
      const file = target.replace("*", match);
      if (existsSync(join(packageRoot, file))) {
        return file;
      }
    }
  }
  return undefined;
}
