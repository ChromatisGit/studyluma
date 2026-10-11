import { moduleConfig } from "@chromatis/base/module";
import { config } from "chromatis-config";
import shellModule from "../module";
import { shellConfigSchema, type ShellConfig } from "../domain/shellConfig";

/**
 * The shell's configuration for this build. An instance that disables the
 * module (or the tests, uninjected) gets the defaults: no extra navigation and
 * the login button.
 */
export function shellSettings(): ShellConfig {
  return "shell" in config
    ? moduleConfig(shellModule, config)
    : shellConfigSchema.parse({});
}
