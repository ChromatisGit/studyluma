import { moduleConfig } from "@chromatis/base/module";
import { config } from "chromatis-config";
import classroomModule from "../module";
import {
  classroomSettingsFrom,
  type ClassroomSettings,
} from "./classroomConfig";

/**
 * The classroom's configuration for this build (`config/classroom.toml`,
 * validated when the instance was built). Server composition reads it here
 * and passes it down; the classroom code itself takes its settings as
 * parameters.
 */
export function classroomSettings(): ClassroomSettings {
  return classroomSettingsFrom(moduleConfig(classroomModule, config));
}

/**
 * Whether this build has the classroom: a module an instance disables has no
 * entry in `chromatis-config`. Without it there are no sessions, and the pages
 * show no classroom controls.
 */
export function classroomEnabled(): boolean {
  return "classroom" in config;
}
