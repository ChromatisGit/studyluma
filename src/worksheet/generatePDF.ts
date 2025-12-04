import { mkdir } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type GeneratePdfOptions = {
  showSolutions?: boolean;
};

export async function generatePDF(
  sourcePath: string,
  targetPdfPath: string,
  options: GeneratePdfOptions = {},
): Promise<void> {
  // Make sure the target directory exists
  await mkdir(path.dirname(targetPdfPath), { recursive: true });

  const args = ["compile", sourcePath, targetPdfPath];

  if (options.showSolutions) {
    // Available inside Typst as sys.inputs.showSolutions = "true"
    args.push("--input", "showSolutions=true");
  }

  try {
    await execFileAsync("typst", args);
  } catch (err: any) {
    // You can improve diagnostics later if you want
    throw new Error(
      `Typst compile failed for ${sourcePath}: ${
        err?.stderr || err?.message || err
      }`,
    );
  }
}