import base from "@chromatis/base/infra/eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "build/**",
      "dist/**",
      ".react-router/**",
      ".chromatis/**",
    ],
  },
  ...base,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parserOptions: { projectService: true } },
  },
];
