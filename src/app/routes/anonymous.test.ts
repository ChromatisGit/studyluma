import { expect, test } from "bun:test";
import { createCloudflareRuntime } from "@chromatis/base/runtime";
import { loader as homeLoader } from "./home";
import { loader as loginLoader } from "./login";

const context = {
  runtime: createCloudflareRuntime({}, "production"),
};

test("anonymous visitors reach login without database secrets", async () => {
  const request = new Request("https://example.test/", {
    headers: { Cookie: "unrelated=value" },
  });

  try {
    await homeLoader({ request, context, url: new URL(request.url) });
    throw new Error("Expected a redirect to login");
  } catch (response) {
    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
    expect((response as Response).headers.get("Location")).toBe(
      "/login?from=%2F",
    );
  }
  expect(
    await loginLoader({
      request: new Request("https://example.test/login"),
      context,
    }),
  ).toBeNull();
});
