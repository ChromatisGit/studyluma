import fs from "fs";
import path from "path";
import yaml from "yaml";

const BASE_DIR = "./base";
const COURSES_DIR = "./courses";
const OUT_DIR = "./website/.generated";

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT_DIR, "data"), { recursive: true });

const topics = fs.readdirSync(path.join(BASE_DIR, "math"));
const outData = { topics };

fs.writeFileSync(
  path.join(OUT_DIR, "data", "topics.json"),
  JSON.stringify(outData, null, 2)
);

console.log("Generated:", outData);