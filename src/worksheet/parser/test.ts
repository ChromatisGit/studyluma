import { writeFile } from "../../builder/io";
import { buildWorksheetData } from "./buildWorksheet";

async function main() {
  const worksheet = await buildWorksheetData(
    "content/base/math/vektorgeometrie/content-pool/worksheet.typ",
    "web"
  );

  await writeFile({
    relativePath: "test.json",
    content: JSON.stringify(worksheet, null, 2),
  });
}

main();
