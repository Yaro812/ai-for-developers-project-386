import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../App.tsx";
import { stubServer } from "../test-server.ts";

function renderBookingPage(id: string) {
  window.history.pushState({}, "", `/book/${id}`);
  render(<App />);
}

const reviewCall = {
  id: "review-90",
  title: "Ревью проекта",
  description: "Разберём код\nи план",
  durationMinutes: 90,
};

test("the header shows the event type title, duration and description with its line breaks", async () => {
  stubServer({ "GET /api/event-types/review-90": () => Response.json(reviewCall) });

  renderBookingPage("review-90");

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(document.title).toBe("Ревью проекта");
  expect(screen.getByText("90 мин.")).toBeTruthy();
  const description = screen.getByText(
    (_, element) => element?.textContent === "Разберём код\nи план",
  );
  expect(getComputedStyle(description).whiteSpace).toBe("pre-wrap");
  expect(screen.getByRole("link", { name: "К каталогу типов встреч" }).getAttribute("href")).toBe(
    "/book",
  );
});

const { description: _description, ...withoutDescription } = reviewCall;

test.each([
  ["no description", withoutDescription],
  ["an empty description", { ...reviewCall, description: "" }],
])("with %s the header shows only the title and duration", async (_, eventType) => {
  stubServer({ "GET /api/event-types/review-90": () => Response.json(eventType) });

  renderBookingPage("review-90");

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(screen.getAllByRole("paragraph").map((paragraph) => paragraph.textContent)).toEqual([
    "90 мин.",
  ]);
});

test("the page shows only a loading indicator until the server answers", async () => {
  let answer = (_response: Response) => {};
  stubServer({
    "GET /api/event-types/review-90": () => new Promise((resolve) => (answer = resolve)),
  });

  renderBookingPage("review-90");

  expect(await screen.findByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
  expect(screen.queryByRole("heading")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();

  answer(Response.json(reviewCall));

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("the guest opens the booking page from its catalog card", async () => {
  stubServer({
    "GET /api/event-types": () => Response.json([reviewCall]),
    "GET /api/event-types/review-90": () => Response.json(reviewCall),
  });
  window.history.pushState({}, "", "/book");
  render(<App />);

  fireEvent.click(await screen.findByRole("link", { name: "Ревью проекта" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(window.location.pathname).toBe("/book/review-90");
  expect(document.title).toBe("Ревью проекта");
});

test.each([
  ["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ["a server error", () => Response.json({ message: "boom" }, { status: 500 })],
])("after %s the page asks to reload it and does not retry", async (_, answer) => {
  const fetch = stubServer({ "GET /api/event-types/review-90": answer });

  renderBookingPage("review-90");

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByRole("heading")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("an unknown event type says it is not found and links to the catalog on the same URL", async () => {
  stubServer({
    "GET /api/event-types/missing": () =>
      Response.json(
        {
          statusCode: 404,
          code: "EVENT_TYPE_NOT_FOUND",
          error: "Not Found",
          message: "Event type missing not found",
        },
        { status: 404 },
      ),
  });

  renderBookingPage("missing");

  expect(
    await screen.findByRole("heading", { level: 1, name: "Тип встречи не найден" }),
  ).toBeTruthy();
  expect(document.title).toBe("Тип встречи не найден");
  expect(window.location.pathname).toBe("/book/missing");
  expect(screen.getByRole("link", { name: "К каталогу типов встреч" }).getAttribute("href")).toBe(
    "/book",
  );
});
