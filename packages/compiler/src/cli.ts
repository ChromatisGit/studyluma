import { resolve } from "node:path";
import { CompileFailure, writeBuild } from "./compile";
const [root, output] = process.argv.slice(2);
if (!root || !output) {
  console.error("Usage: bun src/cli.ts <content-root> <output-root>");
  process.exit(2);
}
try {
  const result = writeBuild(resolve(root), resolve(output));
  for (const d of result.diagnostics)
    console.error(
      `${d.severity} ${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}`,
    );
  console.log(result.path);
} catch (e) {
  if (e instanceof CompileFailure) console.error(e.message);
  else console.error(e);
  process.exit(1);
}
