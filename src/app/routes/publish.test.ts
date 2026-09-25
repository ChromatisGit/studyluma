import { expect, test } from "bun:test";
import { createCloudflareRuntime } from "@chromatis/base/runtime";
import { action } from "./publish";

test("publish authorization reads the Worker secret binding", async () => {
  const context = {
    runtime: createCloudflareRuntime(
      { PUBLISH_TOKEN: "worker-token" },
      "production",
    ),
  };
  const authorized = await action({
    request: new Request("https://example.test/api/publish", {
      method: "POST",
      headers: { Authorization: "Bearer worker-token" },
      body: "{",
    }),
    context,
  });
  expect(authorized.status).toBe(400);

  const denied = await action({
    request: new Request("https://example.test/api/publish", {
      method: "POST",
    }),
    context,
  });
  expect(denied.status).toBe(401);
});
