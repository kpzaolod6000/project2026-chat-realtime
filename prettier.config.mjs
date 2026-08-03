// Prettier runs once from the repo root over every file, so there is one
// config and no per-package copy to drift. It is kept out of the Turbo
// task graph on purpose: formatting has no inputs to cache and no
// dependency on any package being built.
export { default } from "@chat/config/prettier";
