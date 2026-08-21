import js from "@eslint/js";
import tsPlugin from "typescript-eslint";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error", "info", "debug"] }],
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/dist-electron/**",
      "**/build/**",
      "**/node_modules/**",
      "**/.code-review-graph/**",
      "**/coverage/**",
      "**/*.js",
      "!eslint.config.js",
    ],
  },
];
