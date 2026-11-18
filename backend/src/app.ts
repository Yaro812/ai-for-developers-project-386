import { fileURLToPath } from "node:url";
import createError from "@fastify/error";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import openapiGlue from "fastify-openapi-glue";
import type { RouteHandlers } from "./generated/fastify.gen.ts";
import type { BookingWindowDay, EventType, RouteNotFoundError } from "./generated/types.gen.ts";

const specification = fileURLToPath(new URL("../../contract/openapi.yaml", import.meta.url));

// Handlers throw these; Fastify answers `{ statusCode, code, error, message }`, the contract's error format.
const EventTypeIdTaken = createError(
  "EVENT_TYPE_ID_TAKEN",
  "Event type id %s is already taken",
  409,
);
const EventTypeNotFound = createError("EVENT_TYPE_NOT_FOUND", "Event type %s not found", 404);

const ownerTimeZone = "Europe/Moscow";
const bookingWindowDays = 14;
const slotStepMinutes = 15;
// Monday to Friday (ISO days 1–5), 09:00–18:00 in the owner's time zone.
const workingHours = {
  lastWeekday: 5,
  start: Temporal.PlainTime.from("09:00"),
  end: Temporal.PlainTime.from("18:00"),
};

// The current moment comes from the runtime clock; `Date.now()` lets tests set it.
function bookingWindow(durationMinutes: number): BookingWindowDay[] {
  const now = Temporal.Instant.fromEpochMilliseconds(Date.now());
  const today = now.toZonedDateTimeISO(ownerTimeZone).toPlainDate();
  return Array.from({ length: bookingWindowDays }, (_, index) => {
    const date = today.add({ days: index });
    const at = (plainTime: Temporal.PlainTime) =>
      date.toZonedDateTime({ timeZone: ownerTimeZone, plainTime }).toInstant();
    const slots = [];
    if (date.dayOfWeek <= workingHours.lastWeekday) {
      const dayEnd = at(workingHours.end);
      for (let start = at(workingHours.start); ; start = start.add({ minutes: slotStepMinutes })) {
        const end = start.add({ minutes: durationMinutes });
        if (Temporal.Instant.compare(end, dayEnd) > 0) break;
        // A slot starts strictly after the current moment.
        if (Temporal.Instant.compare(start, now) <= 0) continue;
        slots.push({ start: utc(start), end: utc(end) });
      }
    }
    return { date: date.toString(), slots };
  });
}

// ISO 8601 in UTC with milliseconds, like `Date.prototype.toISOString`.
const utc = (instant: Temporal.Instant) => instant.toString({ fractionalSecondDigits: 3 });

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
    // The id check and the save run with no `await` between them,
    // so of two simultaneous requests with one id the second sees the first and gets 409.
    async createEventType(request, reply) {
      const eventType = request.body;
      if (eventTypes.some(({ id }) => id === eventType.id)) {
        throw new EventTypeIdTaken(eventType.id);
      }
      eventTypes.push(eventType);
      return reply.code(201).send(eventType);
    },
    async getEventType(request, reply) {
      const eventType = eventTypes.find(({ id }) => id === request.params.id);
      if (!eventType) throw new EventTypeNotFound(request.params.id);
      return reply.code(200).send(eventType);
    },
    async listSlots(request, reply) {
      const eventType = eventTypes.find(({ id }) => id === request.params.id);
      if (!eventType) throw new EventTypeNotFound(request.params.id);
      return reply.code(200).send(bookingWindow(eventType.durationMinutes));
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
