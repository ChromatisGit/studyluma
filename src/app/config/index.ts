import source from "./config.toml?raw";
import { parseWebsiteConfig } from "./config";
import type { ConfigEnvironment } from "@chromatis/base/config";

const configurations = new Map<
  ConfigEnvironment,
  ReturnType<typeof parseWebsiteConfig>
>();

export function getWebsiteConfig(environment: ConfigEnvironment) {
  let configuration = configurations.get(environment);
  if (!configuration) {
    configuration = parseWebsiteConfig(source, environment);
    configurations.set(environment, configuration);
  }
  return configuration;
}
