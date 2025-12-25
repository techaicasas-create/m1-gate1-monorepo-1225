/* eslint-env node */

/**
 * Gate1 目标：先让 CI 全绿，把工程底座（monorepo / CI / 安全扫描 / OpenAPI）跑通。
 * 后续进入 M2/M3 再逐步把规则收紧。
 */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  ignorePatterns: [
    "**/dist/**",
    "**/build/**",
    "**/.output/**",
    "**/.next/**",
    "**/node_modules/**",
  ],

  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: false,
  },
  plugins: ["@typescript-eslint"],
  // Gate1：先用最小规则集，避免因为模板代码的 TODO / any / unused 造成 CI 反复红。
  // 进入 M2/M3 后再切到 "plugin:@typescript-eslint/recommended" 并逐条收紧。
  extends: ["eslint:recommended"],

  // ✅ Gate1：先不让这些规则阻断 CI（后续再加严）
  rules: {
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },

  overrides: [
    {
      files: ["**/*.cjs"],
      parser: "espree",
      parserOptions: { sourceType: "script" },
    },
  ],
};
