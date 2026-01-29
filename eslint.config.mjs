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

  {
    plugins: { boundaries },
    settings: {
  "boundaries/elements": [
    { type: "app", pattern: "src/app/**" },
    { type: "features", pattern: "src/features/:feature/**" },
    { type: "ui", pattern: "src/ui/**" },
    { type: "schema", pattern: "src/schema/**" },

    { type: "server-actions", pattern: "src/server/actions/**" },
    { type: "server-services", pattern: "src/server/services/**" },
    { type: "server-repo", pattern: "src/server/repo/**" },
    { type: "server-db", pattern: "src/server/db/**" },
    { type: "server-dev", pattern: "src/server/dev/**" },
    { type: "server-providers", pattern: "src/server/providers/**" },
    { type: "server-lib", pattern: "src/server/lib/**" },
    { type: "server-config", pattern: "src/server/config/**" },

    { type: "server", pattern: "src/server/**" },

    { type: "pipeline", pattern: "pipeline/**" },
  ],
}
,

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
              allow: ["app", "features", "ui", "schema", "server-actions", "server-services"],
            },

            // -------------------------
            // features/
            // -------------------------
            {
              from: "features",
              allow: ["ui", "schema"],
              disallow: ["app", "server", "server-actions"],
              disallow: [["features", { feature: "!${from.feature}" }]],
            },

            // -------------------------
            // ui/
            // -------------------------
            {
              from: "ui",
              allow: ["ui", "schema"],
              disallow: ["app", "features", "server", "server-actions"],
            },

            // -------------------------
            // schema/ (pure types)
            // -------------------------
            {
              from: "schema",
              allow: ["schema"],
              disallow: ["app", "features", "ui", "server", "server-actions", "pipeline"],
            },

            // -------------------------
            // server-actions - can call services, lib
            // -------------------------
            {
              from: "server-actions",
              allow: ["server-actions", "server-services", "server-lib", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-services - can call repo, lib, providers, config
            // -------------------------
            {
              from: "server-services",
              allow: ["server-services", "server-repo", "server-lib", "server-providers", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-repo - can call db, dev, lib, config (facade)
            // -------------------------
            {
              from: "server-repo",
              allow: ["server-repo", "server-db", "server-dev", "server-lib", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-db - can call lib, config, repo types
            // -------------------------
            {
              from: "server-db",
              allow: ["server-db", "server-lib", "server-config", "server-repo", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-dev - can call lib, config, repo types
            // -------------------------
            {
              from: "server-dev",
              allow: ["server-dev", "server-lib", "server-config", "server-repo", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-providers - can call lib, config
            // -------------------------
            {
              from: "server-providers",
              allow: ["server-providers", "server-lib", "server-config", "schema"],
              disallow: ["app", "features", "ui"],
            },

            // -------------------------
            // server-lib - pure utilities, can only call config
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
            // pipeline
            // -------------------------
            {
              from: "pipeline",
              allow: ["pipeline", "schema"],
              disallow: ["app", "features", "ui", "server", "server-actions"],
            },
          ],
        },
      ],
    },
  },
]);
