import node from "./eslint/node.mjs";

// This package holds only config, so it lints itself with its own preset.
export default [...node({ tsconfigRootDir: import.meta.dirname })];
