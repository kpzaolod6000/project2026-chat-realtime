/**
 * Formatting settled once, so no package argues about it.
 *
 * The values match what the scaffold already writes by hand, so adopting
 * Prettier does not produce a repo-wide reformat diff that buries the
 * real change in this task.
 *
 * @type {import("prettier").Config}
 */
export default {
  semi: true,
  singleQuote: false,
  printWidth: 90,
  trailingComma: "all",
};
