// Import order is load-bearing. ESM evaluates these in the order written,
// so the root .env is in process.env before the schema reads it.
import "./load-root-env";
import "./src/env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Both packages are compiled from workspace source rather than a
  // published build, so Next has to transpile them itself.
  transpilePackages: ["@chat/shared"],
};

export default nextConfig;
