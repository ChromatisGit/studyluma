import type {
  RuntimeDefinition,
  StatefulRuntime,
} from "@chromatis/base/stateful";
import {
  createClassroomService,
  type ClassroomService,
  type SessionRegistry,
} from "../application/classroomService";
import { createClassroomRuntime } from "../runtime/classroomRuntime";

/**
 * The server's one Classroom Service. The server entry of each target
 * (Bun/Docker or Cloudflare) registers its Runtime Host; the Classroom
 * itself does not know which one it runs on.
 */
export const classroomDefinitions: readonly RuntimeDefinition[] = [
  createClassroomRuntime(),
];

type Registry = { service?: ClassroomService };

const registry: Registry = ((
  globalThis as { __studylumaClassroom?: Registry }
).__studylumaClassroom ??= {});

export function configureClassroom(
  runtime: StatefulRuntime,
  sessionRegistry?: SessionRegistry,
): ClassroomService {
  registry.service = createClassroomService(
    runtime,
    sessionRegistry ? { registry: sessionRegistry } : {},
  );
  return registry.service;
}

/**
 * Without a server entry (the Vite dev server) sessions live in this
 * process; commands work, only the realtime socket is missing and clients
 * fall back to polling.
 */
export function classroom(): ClassroomService {
  if (!registry.service) {
    throw new Error("Classroom Runtime Host was not configured");
  }
  return registry.service;
}
