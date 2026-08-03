import { z } from "zod";

/**
 * Public configuration for apps/web.
 *
 * Everything here is `NEXT_PUBLIC_`, which means Next inlines the literal
 * value into the browser bundle at build time. There is no such thing as a
 * secret in this file: a value that must stay private belongs in
 * apps/server, behind an endpoint.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z
    .url()
    .refine((value) => !value.endsWith("/"), "must not end with a slash"),
  NEXT_PUBLIC_LIVEKIT_URL: z.url(),
});

export type PublicEnv = z.infer<typeof envSchema>;

// Written out key by key on purpose. Next only substitutes statically
// analysable reads such as `process.env.NEXT_PUBLIC_API_URL`; handing it
// `process.env` as an object, or indexing it dynamically, yields undefined
// in the browser while still working on the server - the worst kind of
// bug, because it passes every server-side check.
const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  // Thrown rather than `process.exit`: this module is evaluated both in
  // Node during the build and in the browser at runtime. next.config.ts
  // imports it, so a bad value fails the build instead of shipping.
  throw new Error(
    `Invalid environment for apps/web:\n${details}\n\n` +
      "Expected variables are documented in .env.example at the repo root.",
  );
}

export const env: PublicEnv = parsed.data;
