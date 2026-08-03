export { createPrismaClient, type PrismaClientOptions } from "./client.js";

// Re-exported so apps/server never imports from the generated directory,
// keeping the generator's output path an internal detail of this package.
export { PrismaClient } from "./generated/prisma/client.js";
