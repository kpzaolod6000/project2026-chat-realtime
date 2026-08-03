import Fastify, { type FastifyInstance } from "fastify";

/**
 * Builds a fully configured Fastify instance without binding a port.
 *
 * Keeping construction separate from listening lets tests drive the API
 * through `app.inject()` with no socket involved, and keeps the entrypoint
 * responsible for nothing but process concerns.
 *
 * Plugins (CORS, cookies, CSRF, rate limiting) and routes are registered
 * here as later groups add them.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true,
    // Trust the reverse proxy for client IPs; the auth rate limiter in
    // group 4 keys on them, and without this every request looks like
    // it came from the proxy.
    trustProxy: true,
  });

  return app;
}
