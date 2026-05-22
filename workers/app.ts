import { createRequestHandler, type ServerBuild } from "react-router";
import { runWithRuntimeEnv } from "@platform/framework/runtime";

type WorkerEnv = Record<string, string | undefined>;

interface WorkerExecutionContext {
	waitUntil(promise: Promise<unknown>): void;
	passThroughOnException?(): void;
}

interface WorkerHandler {
	fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext): Promise<Response>;
}

const requestHandler = createRequestHandler(
	(() => import("virtual:react-router/server-build")) as () => Promise<ServerBuild>,
	import.meta.env.MODE,
);

export default {
	async fetch(request: Request, env: WorkerEnv, ctx: WorkerExecutionContext) {
		return runWithRuntimeEnv(env, () => requestHandler(request));
	},
} satisfies WorkerHandler;
