import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Rules every package gets, whatever its runtime.
 *
 * No formatting rules here, deliberately. Prettier owns formatting; a
 * linter that also reformats turns every stylistic difference into an
 * error competing for attention with the ones that matter.
 */
export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended);
