import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";

export interface PrismaClientOptions {
  /** PostgreSQL connection string. */
  connectionString: string;
  /** Log every query. Useful locally, noisy and slow in production. */
  logQueries?: boolean;
}

/**
 * Creates a PrismaClient bound to a PostgreSQL driver adapter.
 *
 * A factory rather than a shared singleton: the caller owns the lifetime and
 * is responsible for `$disconnect()` on shutdown. Tests get an isolated
 * client per case, and the repositories in group 3 receive this instance
 * through their constructor instead of importing it.
 *
 * Prisma 7 removed the Rust query engine, so an adapter is mandatory rather
 * than optional.
 */
export function createPrismaClient(options: PrismaClientOptions): PrismaClient {
  const adapter = new PrismaPg({ connectionString: options.connectionString });

  return new PrismaClient({
    adapter,
    log: options.logQueries === true ? ["query", "warn", "error"] : ["warn", "error"],
  });
}
