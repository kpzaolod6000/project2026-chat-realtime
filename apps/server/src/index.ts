import { buildApp } from "./app.js";

// Replaced by validated, typed env in task 1.9.
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3001);

const app = buildApp();

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, "shutting down");
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
