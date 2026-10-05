import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Mirrors @chromatis/base/vite. Node cannot load that TypeScript helper
// from node_modules when it reads this config, so the few lines live here.
export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom", "react-router", "lucide-react"],
  },
  // The framework ships TSX source; pre-bundle it with the automatic runtime.
  optimizeDeps: {
    esbuildOptions: { jsx: "automatic" },
  },
  plugins: [reactRouter(), tsconfigPaths({ projects: ["./tsconfig.json"] })],
});
