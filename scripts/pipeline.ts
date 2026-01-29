import { runPipeline } from "@pipeline/main";

runPipeline().catch((err) => {
  console.error("[applySQL] Failed:", err);
  process.exit(1);
});