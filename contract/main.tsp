import "@typespec/http";
import "@typespec/json-schema";

using Http;
using TypeSpec.JsonSchema;

/** Call booking API. Operations are named in camelCase, so each `operationId` equals the operation name. */
@service(#{ title: "Календарь звонков" })
namespace Calendar;

/**
 * Error body in Fastify's format; clients tell errors apart by `code`.
 * A concrete error extends it with `@statusCode` and a literal `code`.
 */
@error
model ApiError {
  statusCode: int32;
  code: string;
  error: string;
  message: string;
}

/** No route matches a path under `/api/`. No operation returns it, so the server answers it from its not-found handler. */
model RouteNotFoundError extends ApiError {
  @statusCode statusCode: 404;
  code: "ROUTE_NOT_FOUND";
}

model Health {
  status: "ok";
}

/** A kind of call the owner offers. */
model EventType {
  /** Part of the booking page address, e.g. `intro-30`. */
  @pattern("^[a-z0-9]+(-[a-z0-9]+)*$")
  @maxLength(50)
  id: string;

  /** At least one non-whitespace character. */
  @minLength(1)
  @maxLength(100)
  @pattern("\\S")
  title: string;

  /** Plain text; absent when the owner gave none. */
  @maxLength(500)
  description?: string;

  @minValue(15)
  @maxValue(540)
  @multipleOf(15)
  durationMinutes: int32;
}

@route("/api/health")
@get
op getHealth(): Health;

/** All event types in creation order. */
@route("/api/event-types")
@get
op listEventTypes(): EventType[];
