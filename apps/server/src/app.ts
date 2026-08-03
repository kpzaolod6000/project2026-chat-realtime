import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";

export interface TlsMaterial {
  key: Buffer;
  cert: Buffer;
}

export interface BuildAppOptions {
  /**
   * PEM key and certificate. Present means the instance serves HTTPS,
   * which local development needs because the session cookie is
   * `SameSite=None; Secure` and browsers drop `Secure` cookies over HTTP.
   */
  tls?: TlsMaterial;
}

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
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const base = {
    logger: true,
    // Trust the reverse proxy for client IPs; the auth rate limiter in
    // group 4 keys on them, and without this every request looks like
    // it came from the proxy.
    trustProxy: true,
  } satisfies FastifyServerOptions;

  if (options.tls === undefined) {
    return Fastify(base);
  }

  // One return type for both transports, so callers and tests never branch
  // on whether TLS happens to be configured.
  return Fastify({ ...base, https: options.tls });
}
