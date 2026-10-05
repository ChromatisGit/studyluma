import { fileURLToPath } from "node:url";
import path from "node:path";

import base from "@chromatis/base/infra/eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ["node_modules/**", "build/**", ".react-router/**"],
  },
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
];
