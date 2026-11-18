import { fileURLToPath } from "node:url";
import { buildApp } from "./app.ts";

// `mise run build` puts the frontend here; in development Vite serves it instead.
const frontendRoot = fileURLToPath(new URL("../../frontend/dist", import.meta.url));
const app = buildApp({ logger: true, frontendRoot });

try {
  await app.listen({
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? 3000),
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
