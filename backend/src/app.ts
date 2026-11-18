import { fileURLToPath } from "node:url";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import openapiGlue from "fastify-openapi-glue";
import type { RouteHandlers } from "./generated/fastify.gen.ts";
import type { EventType, RouteNotFoundError } from "./generated/types.gen.ts";

const specification = fileURLToPath(new URL("../../contract/openapi.yaml", import.meta.url));

export type AppOptions = FastifyServerOptions & {
  /** Directory of the built frontend, served next to the API; without it the app serves only the API. */
  frontendRoot?: string;
};

// `beforeRoutes` registers plugins that must see the routes, such as response validation in tests.
export function buildApp(
  { frontendRoot, ...options }: AppOptions = {},
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
  if (frontendRoot) app.register(fastifyStatic, { root: frontendRoot });

  app.setNotFoundHandler((request, reply) => {
    // A page path that matches no file gets index.html, so a direct visit opens the page (ADR-0002).
    const isPage = !/^\/api(\/|\?|$)/.test(request.url);
    if (frontendRoot && isPage && (request.method === "GET" || request.method === "HEAD")) {
      return reply.sendFile("index.html");
    }
    // An API client always gets a JSON error, never the frontend.
    const body: RouteNotFoundError = {
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      error: "Not Found",
      message: `Route ${request.method}:${request.url} not found`,
    };
    return reply.code(404).send(body);
  });

  return app;
}
