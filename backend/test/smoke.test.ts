import { afterAll, expect, test } from "vitest";
import { buildApp } from "../src/app.ts";

const app = buildApp();

afterAll(() => app.close());

test("app starts and responds over HTTP", async () => {
  const address = await app.listen({ port: 0 });

  const response = await fetch(`${address}/health`);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
