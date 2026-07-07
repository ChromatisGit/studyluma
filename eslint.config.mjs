import { fileURLToPath } from "node:url";
import path from "node:path";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";

import base from "@chromatis/base/infra/eslint";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "build/**",
      ".react-router/**",
      "eslint-boundaries-resolver.cjs",
    ],
  },

  ...base,

  {
    rules: {
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-hooks/set-state-in-effect": "off",
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["react-router.config.ts", "vite.config.ts"],
        },
        tsconfigRootDir: __dirname,
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Ban raw postgres imports everywhere except src/server/db/
  // ---------------------------------------------------------------------------
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    ignores: ["src/server/db/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TaggedTemplateExpression[tag.name='sql']",
          message:
            "Do not use raw sql`...`. Use anonSQL or userSQL from @db/runSQL. For multi-statement transactions use withAnonTx()/withUserTx() from @db/tx.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "postgres",
              message:
                "Do not import the postgres client directly. Use anonSQL/userSQL from @db/runSQL.",
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Architecture boundaries
  // ---------------------------------------------------------------------------
  {
    plugins: { boundaries },
    settings: {
      "boundaries/root-path": __dirname,
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/dependency-nodes": ["import", "export"],
      "import/resolver": {
        [path.join(__dirname, "eslint-boundaries-resolver.cjs")]: {},
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
      "boundaries/elements": [
        { type: "app",              pattern: "src/app/**" },
        { type: "features",         pattern: "src/features/*/**", capture: ["feature"] },
        { type: "ui",               pattern: "src/ui/**" },
        { type: "macros",           pattern: "src/macros/**" },
        { type: "schema",           pattern: "src/schema/**" },
        { type: "types",            pattern: "src/types/**" },

        { type: "server-actions",         pattern: "src/server/actions/**" },
        { type: "server-services",        pattern: "src/server/services/**" },
        { type: "server-db",              pattern: "src/server/db/**" },
        { type: "server-providers",       pattern: "src/server/providers/**" },
        { type: "server-lib",             pattern: "src/server/lib/**" },
        { type: "server-config",          pattern: "src/server/config/**" },

        { type: "server",                 pattern: "src/server/**" },

        { type: "pipeline",         pattern: "pipeline/**" },
      ],
    },

    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: "app",
              allow: ["app", "features", "ui", "macros", "schema", "types", "server-actions", "server-services", "server-lib"],
            },
            {
              from: "features",
              allow: ["features", "ui", "macros", "schema", "types", "server-services", "server-lib"],
              disallow: [["features", { feature: "!${from.feature}" }]],
            },
            {
              from: "ui",
              allow: ["ui", "macros", "schema", "types"],
              disallow: ["app", "features", "server", "server-actions"],
            },
            {
              from: "macros",
              allow: ["macros", "features", "ui", "schema", "types", "pipeline"],
              disallow: ["app", "server", "server-actions"],
            },
            {
              from: "schema",
              allow: ["schema", "macros"],
              disallow: ["app", "features", "ui", "server", "server-actions", "pipeline"],
            },
            {
              from: "types",
              allow: ["types"],
            },
            {
              from: "server-actions",
              allow: ["server-actions", "server-services", "server-lib", "server-config", "schema", "types"],
              disallow: ["app", "features", "ui"],
            },
            {
              from: "server-services",
              allow: ["server-services", "server-db", "server-providers", "server-lib", "server-config", "schema", "types"],
              disallow: ["app", "features", "ui"],
            },
            {
              from: "server-db",
              allow: ["server-db"],
              disallow: ["app", "features", "ui"],
            },
            {
              from: "server-providers",
              allow: ["server-providers", "server-lib", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },
            {
              from: "server-lib",
              allow: ["server-lib", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },
            {
              from: "server-config",
              allow: ["server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },
            {
              from: "pipeline",
              allow: ["pipeline", "macros", "schema"],
              disallow: ["app", "features", "ui", "server", "server-actions"],
            },
          ],
        },
      ],
    },
  },
);
