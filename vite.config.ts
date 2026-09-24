import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  const plugins = [reactRouter()];

  if (process.env.WRANGLER) {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    plugins.push(cloudflare({ viteEnvironment: { name: "ssr" } }));
  }

  return {
    plugins,
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
    },
    optimizeDeps: { exclude: ["@chromatis/base"] },
    resolve: {
      dedupe: [
        "react",
        "react-dom",
        "react-router",
        "lucide-react",
        "motion",
        "framer-motion",
        "sonner",
      ],
    },
    server: {
      fs: {
        allow: [rootDir],
      },
    },
  };
});
