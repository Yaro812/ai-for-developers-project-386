import { expect, test } from "vitest";
import { buildTestApp } from "./app.ts";

test("a new app lists no event types", async () => {
  const response = await buildTestApp().inject({ method: "GET", url: "/api/event-types" });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toEqual([]);
});
