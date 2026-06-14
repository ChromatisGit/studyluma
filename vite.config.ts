import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  const plugins = [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
  ];

  if (process.env.WRANGLER) {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    plugins.push(cloudflare({ viteEnvironment: { name: "ssr" } }));
  }

  return {
    plugins,
    define: {
      __DEMO_MODE__: process.env.DEMO_MODE === "true",
    },
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
    },
    optimizeDeps: {
      include: ["@chromatis/base"],
      esbuildOptions: {
        jsx: "automatic",
        jsxImportSource: "react",
        tsconfigRaw: {
          compilerOptions: {
            jsx: "react-jsx",
          },
        },
      },
    },
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
