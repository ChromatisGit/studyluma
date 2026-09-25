import { parseConfig, resolveEnvironment, z } from "@chromatis/base/config";
import type { ConfigEnvironment } from "@chromatis/base/config";

const schema = z
  .object({
    sessionCookieName: z.string().min(1),
    secureCookies: z.boolean(),
  })
  .strict();

export type WebsiteConfig = Readonly<z.infer<typeof schema>>;

export function websiteEnvironment(
  value: string | undefined,
): ConfigEnvironment {
  return resolveEnvironment(value === "development" ? "local" : value);
}

export function parseWebsiteConfig(
  source: string,
  environment: ConfigEnvironment,
): WebsiteConfig {
  return parseConfig(source, environment, schema);
}
