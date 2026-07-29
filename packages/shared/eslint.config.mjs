import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Replaced by the shared preset from the repo root in task 1.6.
export default tseslint.config(
  { ignores: ["dist/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
