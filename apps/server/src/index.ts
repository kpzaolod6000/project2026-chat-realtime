import { readFileSync } from "node:fs";
import path from "node:path";
import { buildApp, type TlsMaterial } from "./app.js";
import { env, ROOT_DIR } from "./env.js";

/**
 * Reads the local TLS material, if configured.
 *
 * Both paths or neither: serving the key without the certificate is a
 * misconfiguration worth failing on, not a reason to silently downgrade
 * to HTTP and let the session cookie disappear at runtime instead.
 */
function loadTls(): TlsMaterial | undefined {
  const { HTTPS_KEY_FILE, HTTPS_CERT_FILE } = env;

  if (HTTPS_KEY_FILE === undefined && HTTPS_CERT_FILE === undefined) {
    return undefined;
  }

  if (HTTPS_KEY_FILE === undefined || HTTPS_CERT_FILE === undefined) {
    throw new Error(
      "HTTPS_KEY_FILE and HTTPS_CERT_FILE must be set together, or both left empty.",
    );
  }

  // Paths in .env are written relative to the repo root, which is where
  // `pnpm certs` puts them.
  return {
    key: readFileSync(path.resolve(ROOT_DIR, HTTPS_KEY_FILE)),
    cert: readFileSync(path.resolve(ROOT_DIR, HTTPS_CERT_FILE)),
  };
}

let tls: TlsMaterial | undefined;

try {
  tls = loadTls();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error("Run `pnpm certs` at the repo root to generate them.");
  process.exit(1);
}

const app = buildApp({ tls });

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutting down");
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
  app.log.info(
    { scheme: tls === undefined ? "http" : "https", origin: env.WEB_ORIGIN },
    "api listening",
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
