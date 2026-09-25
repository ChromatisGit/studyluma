import { fileURLToPath } from "node:url";
import path from "node:path";
import tseslint from "typescript-eslint";
import base from "@chromatis/base/infra/eslint";

const root = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  { ignores: ["node_modules/**", "build/**", ".react-router/**"] },
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["react-router.config.ts", "vite.config.ts"],
        },
        tsconfigRootDir: root,
      },
    },
  },
);
