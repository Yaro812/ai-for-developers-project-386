import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import openapiGlue from "fastify-openapi-glue";
import type { RouteHandlers } from "./generated/fastify.gen.ts";
import type { EventType } from "./generated/types.gen.ts";

const specification = fileURLToPath(new URL("../../contract/openapi.yaml", import.meta.url));

// `beforeRoutes` registers plugins that must see the routes, such as response validation in tests.
export function buildApp(
  options: FastifyServerOptions = {},
  beforeRoutes?: (app: FastifyInstance) => void,
) {
  const app = Fastify(options);
  // Each app gets its own empty storage, so tests never share data.
  const eventTypes: EventType[] = [];

  const handlers: RouteHandlers = {
    async getHealth(_request, reply) {
      return reply.code(200).send({ status: "ok" });
    },
    async listEventTypes(_request, reply) {
      return reply.code(200).send(eventTypes);
    },
  };

  beforeRoutes?.(app);
  // Routes and request validation come from the contract; handlers are looked up by `operationId`.
  app.register(openapiGlue, { specification, serviceHandlers: handlers });

  return app;
}
