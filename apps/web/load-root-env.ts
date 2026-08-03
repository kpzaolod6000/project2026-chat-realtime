import path from "node:path";
import { config as loadDotenv } from "dotenv";

// Next only auto-loads .env files from the app directory, but this repo
// keeps a single .env at the root so that apps/web, apps/server and
// docker-compose cannot drift apart. Imported for its side effect by
// next.config.ts, before anything reads process.env.
loadDotenv({
  path: path.resolve(import.meta.dirname, "../../.env"),
  quiet: true,
});
