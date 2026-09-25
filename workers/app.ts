import { createRequestHandler, type ServerBuild } from "react-router";
import { createCloudflareRuntime } from "@chromatis/base/runtime";
import { websiteEnvironment } from "../src/app/config/config";

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
	async fetch(request: Request, env: WorkerEnv, _ctx: WorkerExecutionContext) {
		const runtime = createCloudflareRuntime(env, websiteEnvironment(env.NODE_ENV ?? "production"));
		return requestHandler(request, { runtime });
	},
} satisfies WorkerHandler;
