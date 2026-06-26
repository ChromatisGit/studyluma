const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".json"];
const aliases = [
  ["@features/", "src/features/"],
  ["@homepage/", "src/features/homepage/"],
  ["@core/", "src/core/"],
  ["@macros/", "src/macros/"],
  ["@schema/", "src/schema/"],
  ["@ui/", "src/ui/"],
  ["@components/", "src/ui/components/"],
  ["@services/", "src/server/services/"],
  ["@server-lib/", "src/server/lib/"],
];

function resolveFile(basePath) {
  for (const extension of extensions) {
    const candidate = `${basePath}${extension}`;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  for (const extension of extensions.slice(1)) {
    const candidate = path.join(basePath, `index${extension}`);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function aliasTarget(source) {
  for (const [alias, target] of aliases) {
    if (source.startsWith(alias)) {
      return path.join(root, target, source.slice(alias.length));
    }
  }
  return null;
}

exports.interfaceVersion = 2;

exports.resolve = function resolve(source, file) {
  const basePath = source.startsWith(".")
    ? path.resolve(path.dirname(file), source)
    : aliasTarget(source);

  if (!basePath) return { found: false };

  const resolved = resolveFile(basePath);
  return resolved ? { found: true, path: resolved } : { found: false };
};
