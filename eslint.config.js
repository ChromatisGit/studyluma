import base from "@chromatis/base/infra/eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "build/**",
      ".react-router/**",
      ".chromatis/**",
      "react-router.config.ts",
    ],
  },
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { projectService: true } },
  },
];
