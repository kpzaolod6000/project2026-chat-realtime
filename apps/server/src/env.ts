import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// One .env at the repo root feeds both apps and docker-compose. Resolved
// relative to this module rather than to process.cwd(), which differs
// between `pnpm dev` at the root and `pnpm --filter` inside the package.
// src/ and dist/ sit at the same depth, so one path covers both.
const repoRoot = path.resolve(import.meta.dirname, "../../..");
loadDotenv({ path: path.join(repoRoot, ".env"), quiet: true });

/**
 * Every variable apps/server reads, and the shape it must have.
 *
 * A variable belongs here the moment code depends on it, not before. The
 * groups that add LiveKit tokens, rooms and moderation extend this schema
 * as they land.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().max(65535).default(3001),

  // Single allowed origin for CORS and for the Origin check on mutating
  // routes. A trailing slash makes the string comparison fail in a way
  // that is tedious to debug, so it is rejected here instead.
  WEB_ORIGIN: z
    .url()
    .refine((value) => !value.endsWith("/"), "must not end with a slash"),

  SESSION_SECRET: z.string().min(32),

  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  LIVEKIT_URL: z.url(),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(32),

  // Absent means plain HTTP: usable with curl, but the browser drops the
  // Secure session cookie, so the login flow will not work.
  HTTPS_KEY_FILE: z.string().min(1).optional(),
  HTTPS_CERT_FILE: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail before Fastify starts. A missing variable that surfaces later
  // reads as `undefined` three layers down, where the real cause is gone.
  const details = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  console.error(`Invalid environment for apps/server:\n${details}\n`);
  console.error(`Expected variables are documented in ${repoRoot}/.env.example`);
  process.exit(1);
}

export const env: Env = parsed.data;

/** Repo root, so callers can resolve the relative paths in .env. */
export const ROOT_DIR = repoRoot;
