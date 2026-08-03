import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import base from "./base.mjs";

/**
 * Preset for apps/web.
 *
 * Kept separate from the Node preset rather than merged behind a flag:
 * eslint-config-next carries React, hooks and core-web-vitals rules that
 * mean nothing in a service with no views. One shared base, two
 * runtime-specific layers above it.
 */
export default tseslint.config(...base, ...nextVitals, ...nextTs);
