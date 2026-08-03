import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Replaced by the shared preset from the repo root in task 1.6.
export default tseslint.config(
  // Generated Prisma client: not ours to fix, and it carries @ts-nocheck.
  { ignores: ["dist/**", "src/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
