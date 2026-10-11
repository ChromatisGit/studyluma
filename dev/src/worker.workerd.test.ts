import { expect, test } from "bun:test";
import { startBuiltWorkerd } from "@chromatis/base/stateful/workerd";
import { existsSync, readFileSync, readdirSync } from "node:fs";

async function checkAssets(): Promise<void> {
  const asset = readdirSync("build/client/assets").find((name) =>
    name.endsWith(".js"),
  );
  expect(asset).toBeDefined();
  const wrangler = JSON.parse(
    readFileSync("build/server/wrangler.json", "utf8"),
  ) as { assets?: { directory?: string } };
  expect(wrangler.assets?.directory).toBe("../client");
  expect(existsSync(`build/client/assets/${asset}`)).toBe(true);
  const worker = await startBuiltWorkerd({
    entrypoint: `${process.cwd()}/build/server/index.js`,
    durableObjects: { RUNTIME_CLASSROOM: "Runtime_classroom" },
    assetsDirectory: `${process.cwd()}/build/client`,
  });
  try {
    if (!worker.baseUrl) {
      throw new Error("workerd URL unavailable");
    }
    const staticFile = await fetch(new URL(`/assets/${asset}`, worker.baseUrl));
    expect(staticFile.status).toBe(200);
  } finally {
    await worker.dispose();
  }
}

test("framework-generated Worker boots with the Classroom Durable Object", async () => {
  const build = Bun.spawnSync(
    ["bun", "run", "build", "--target", "cloudflare"],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (build.exitCode !== 0) {
    throw new Error(`Cloudflare build failed: ${build.stderr.toString()}`);
  }
  const worker = await startBuiltWorkerd({
    entrypoint: `${process.cwd()}/build/server/index.js`,
    durableObjects: { RUNTIME_CLASSROOM: "Runtime_classroom" },
  });
  try {
    const health = await worker.dispatchFetch(
      "http://worker/_chromatis/health",
    );
    expect(health.status).toBe(200);
    expect(await health.text()).toBe("ok");
    const page = await worker.dispatchFetch("http://worker/");
    expect(page.status).toBe(200);
    await checkAssets();
    const socket = await worker.dispatchFetch("http://worker/classroom/ws");
    expect(socket.status).toBe(426);
    const created = await worker.dispatchFetch("http://worker/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent: "create", title: "Workerd smoke" }),
    });
    expect(created.status).toBe(200);
    const code = ((await created.json()) as { code: string }).code;
    const joined = await worker.dispatchFetch("http://worker/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ intent: "join", code, name: "Second client" }),
    });
    expect(joined.status).toBe(200);
    const cookie = (created as unknown as Response).headers
      .get("set-cookie")
      ?.match(/studyluma-classroom=[^;]+/)?.[0];
    expect(cookie).toBeDefined();
    const upgraded = await worker.dispatchFetch("http://worker/classroom/ws", {
      headers: { upgrade: "websocket", cookie: cookie ?? "" },
    });
    expect(upgraded.status).toBe(101);
    const teacher = upgraded.webSocket;
    expect(teacher).toBeDefined();
    const updated = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("No realtime roster update")),
        3_000,
      );
      teacher?.addEventListener("message", (event) => {
        const message = JSON.parse(String(event.data)) as {
          type?: string;
          snapshot?: { participants?: { connected?: boolean }[] };
        };
        if (
          message.type === "snapshot" &&
          message.snapshot?.participants?.some(
            (participant) => participant.connected,
          )
        ) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    teacher?.accept();
    const studentCookie = (joined as unknown as Response).headers
      .get("set-cookie")
      ?.match(/studyluma-classroom=[^;]+/)?.[0];
    const student = await worker.dispatchFetch("http://worker/classroom/ws", {
      headers: { upgrade: "websocket", cookie: studentCookie ?? "" },
    });
    expect(student.status).toBe(101);
    student.webSocket?.accept();
    await updated;
    student.webSocket?.close();
    upgraded.webSocket?.close();
  } finally {
    await worker.dispose();
  }
}, 30_000);
