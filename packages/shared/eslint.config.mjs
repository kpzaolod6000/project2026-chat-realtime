import node from "@chat/config/eslint/node";

// No type-aware rules here: this package is types, zod schemas and
// constants, with no async surface for the typed rules to act on.
export default [
  { ignores: ["dist/**"] },
  ...node({ tsconfigRootDir: import.meta.dirname }),
];
