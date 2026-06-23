import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

function run(cmd: string, args: string[], opts?: { env?: NodeJS.ProcessEnv }): void {
  const result = spawnSync(cmd, args, {
    env: opts?.env ?? process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runWithInput(cmd: string, args: string[], input: string): void {
  const result = spawnSync(cmd, args, {
    input,
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const configPath = "CONFIG.yaml";
if (!existsSync(configPath)) {
  console.error("CONFIG.yaml not found. Copy CONFIG.template.yaml and fill in the demo section.");
  process.exit(1);
}

const config = parse(readFileSync(configPath, "utf8")) as Record<string, Record<string, string>>;
const demo = config["demo"];

if (!demo?.database || !demo?.session_secret) {
  console.error('CONFIG.yaml is missing the "demo" profile. Add database and session_secret under demo:');
  process.exit(1);
}

const secrets: Record<string, string> = {
  DATABASE_URL: demo.database,
  SESSION_SECRET: demo.session_secret,
};

console.info("[cf:deploy:demo] Building Cloudflare Workers bundle...");
run("bun", ["x", "react-router", "build"], {
  env: { ...process.env, WRANGLER: "1", DEMO_MODE: "true" },
});

console.info("\n[cf:deploy:demo] Deploying to Cloudflare Workers (env: demo)...");
// react-router's generated build/server/wrangler.json drops [env.demo.vars] from wrangler.toml,
// so DEMO_MODE must be passed explicitly here or the worker won't see it at runtime.
run("bun", [
  "x",
  "wrangler",
  "deploy",
  "--env",
  "demo",
  "--config",
  "build/server/wrangler.json",
  "--var",
  "DEMO_MODE:true",
]);

console.info("\n[cf:deploy:demo] Syncing secrets to demo environment...");
for (const [key, value] of Object.entries(secrets)) {
  console.info(`  Setting ${key}...`);
  runWithInput("bun", ["x", "wrangler", "secret", "put", key, "--env", "demo"], value + "\n");
}

console.info("\n[cf:deploy:demo] Done.");
