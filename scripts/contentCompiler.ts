import { runPipeline } from "@pipeline/main";

runPipeline().catch((err) => {
  console.error("[compile] Failed:", err);
  process.exit(1);
});