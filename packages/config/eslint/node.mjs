import globals from "globals";
import tseslint from "typescript-eslint";
import base from "./base.mjs";

/**
 * Preset for the Node-side packages: apps/server, packages/shared,
 * packages/database.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir Directory holding the consuming
 *   package's `tsconfig.json`. Pass `import.meta.dirname`.
 * @param {boolean} [options.typeChecked=false] Enable the rules that need
 *   the type checker: floating promises, misused awaits, unsafe `any`
 *   flow. They make ESLint build a TypeScript program on every run, so a
 *   package opts in rather than paying the cost by default.
 * @param {string[]} [options.allowDefaultProject] TypeScript files that
 *   sit outside the tsconfig `include` but should still be linted, such
 *   as a tool's config file at the package root. Without this the project
 *   service refuses to parse them.
 * @returns {import("typescript-eslint").ConfigArray}
 */
export default function nodeConfig({
  tsconfigRootDir,
  typeChecked = false,
  allowDefaultProject = [],
}) {
  return tseslint.config(
    ...base,
    { languageOptions: { globals: globals.node } },
    ...(typeChecked
      ? [
          ...tseslint.configs.recommendedTypeChecked,
          {
            languageOptions: {
              parserOptions: {
                projectService:
                  allowDefaultProject.length > 0 ? { allowDefaultProject } : true,
                tsconfigRootDir,
              },
            },
          },
          // eslint.config.mjs and any other loose script sits outside the
          // tsconfig `include`, so no program exists to type-check it
          // against. Linting those untyped is cheaper than widening
          // `include` and dragging config files into the build.
          {
            files: ["**/*.mjs", "**/*.cjs", "**/*.js"],
            ...tseslint.configs.disableTypeChecked,
          },
        ]
      : []),
  );
}
