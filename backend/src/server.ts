import { buildApp } from "./app.ts";

const app = buildApp({ logger: true });

try {
  await app.listen({
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? 3000),
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
