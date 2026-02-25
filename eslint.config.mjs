import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".generated/**",
  ]),

  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },

  // ---------------------------------------------------------------------------
  // Ban raw postgres imports everywhere except src/server/db/
  // tx.ts and runSQL.ts are the only files allowed to touch the postgres client.
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
      "boundaries/elements": [
        { type: "app",              pattern: "src/app/**" },
        { type: "features",         pattern: "src/features/:feature/**" },
        { type: "ui",               pattern: "src/ui/**" },
        { type: "macros",           pattern: "src/macros/**" },
        { type: "schema",           pattern: "src/schema/**" },
        { type: "types",            pattern: "src/types/**" },

        { type: "server-actions",   pattern: "src/server/actions/**" },
        { type: "server-services",  pattern: "src/server/services/**" },
        { type: "server-db",        pattern: "src/server/db/**" },
        { type: "server-providers", pattern: "src/server/providers/**" },
        { type: "server-lib",       pattern: "src/server/lib/**" },
        { type: "server-config",    pattern: "src/server/config/**" },

        { type: "server",           pattern: "src/server/**" },

        { type: "pipeline",         pattern: "pipeline/**" },
      ],
    },

    rules: {
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // -------------------------
            // app/ - can import public API (actions, services)
            // -------------------------
            {
              from: "app",
              allow: ["app", "features", "ui", "macros", "schema", "types", "server-actions", "server-services"],
            },

            // -------------------------
            // features/ - isolated; no cross-feature imports
            // -------------------------
            {
              from: "features",
              allow: ["ui", "macros", "schema", "types"],
              disallow: [["features", { feature: "!${from.feature}" }]],
            },

            // -------------------------
            // ui/
            // -------------------------
            {
              from: "ui",
              allow: ["ui", "schema", "types"],
              disallow: ["app", "features", "server", "server-actions"],
            },

            // -------------------------
            // macros/
            // -------------------------
            {
              from: "macros",
              allow: ["macros", "features", "ui", "schema", "types", "pipeline"],
              disallow: ["app", "server", "server-actions"],
            },

            // -------------------------
            // schema/ (pure types — no runtime deps)
            // -------------------------
            {
              from: "schema",
              allow: ["schema", "macros"],
              disallow: ["app", "features", "ui", "server", "server-actions", "pipeline"],
            },

            // -------------------------
            // types/ (generated DB types)
            // -------------------------
            {
              from: "types",
              allow: ["types"],
            },

            // -------------------------
            // server-actions - security boundary (auth checks, session gate)
            // -------------------------
            {
              from: "server-actions",
              allow: ["server-actions", "server-services", "server-lib", "server-config", "schema", "types"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-services - business logic; queries via anonSQL/userSQL from server-db
            // -------------------------
            {
              from: "server-services",
              allow: ["server-services", "server-db", "server-providers", "server-lib", "server-config", "schema", "types"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-db - tx.ts + runSQL.ts only; no upward imports
            // -------------------------
            {
              from: "server-db",
              allow: ["server-db"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-providers - content JSON loaders (no DB)
            // -------------------------
            {
              from: "server-providers",
              allow: ["server-providers", "server-lib", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-lib - pure server utilities
            // -------------------------
            {
              from: "server-lib",
              allow: ["server-lib", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-config - pure config
            // -------------------------
            {
              from: "server-config",
              allow: ["server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // pipeline - content processing (server/pipeline only)
            // -------------------------
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
]);
