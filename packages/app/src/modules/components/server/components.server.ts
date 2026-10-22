import { moduleConfig } from "@chromatis/base/module";
import { config } from "chromatis-config";
import componentsModule from "../module";

/**
 * The names of the components this build activates: the folder names in
 * `config/components.toml`. An instance without the file (or the tests,
 * uninjected) has none.
 */
export function activeComponents(): string[] {
  return "components" in config
    ? moduleConfig(componentsModule, config).components.map((folder) =>
        folder.slice(folder.lastIndexOf("/") + 1),
      )
    : [];
}
