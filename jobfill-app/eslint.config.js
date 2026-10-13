import eslintConfigPrettier from "eslint-config-prettier";
import parser from "@typescript-eslint/parser";
import ts from "@typescript-eslint/eslint-plugin";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";

export default [
  // Phase 2 linting targets the new TypeScript source; legacy extension scripts
  // remain intentionally outside this tooling migration.
  { ignores: ["dist/**", "node_modules/**"] },
  { files: ["**/*.{ts,tsx}"], languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { "@typescript-eslint": ts, "react-hooks": hooks, "jsx-a11y": a11y }, rules: { ...ts.configs.recommended.rules, ...hooks.configs.recommended.rules, ...a11y.configs.recommended.rules } },
  eslintConfigPrettier,
];
