import node from "@chat/config/eslint/node";

// Type-aware rules are on: every repository method added in group 3 is
// async, which is exactly what the floating-promise rules catch.
export default [
  // Generated Prisma client: not ours to fix, and it carries @ts-nocheck.
  { ignores: ["dist/**", "src/generated/**"] },
  ...node({
    tsconfigRootDir: import.meta.dirname,
    typeChecked: true,
    // Read by the Prisma CLI, never compiled into dist/, so it is outside
    // the tsconfig `include` and needs an explicit exemption to be linted.
    allowDefaultProject: ["prisma.config.ts"],
  }),
];
