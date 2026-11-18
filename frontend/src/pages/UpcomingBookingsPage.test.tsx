import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "../App.tsx";
import { stubServer } from "../test-server.ts";

function renderPage() {
  window.history.pushState({}, "", "/owner/bookings");
  render(<App />);
}

// Fake guest addresses on the reserved example.com domain.
const email = (local: string) => `${local}@example.com`;

const bookings = [
  {
    eventType: { id: "intro-60", title: "Знакомство", durationMinutes: 60 },
    // Thursday, 10:00–11:00 in Moscow.
    start: "2026-11-19T07:00:00.000Z",
    end: "2026-11-19T08:00:00.000Z",
    guestName: "Анна",
    guestEmail: email("anna"),
  },
  {
    eventType: { id: "review-90", title: "Ревью проекта", durationMinutes: 90 },
    // Friday, 17:00–18:30 in Moscow.
    start: "2026-11-20T14:00:00.000Z",
    end: "2026-11-20T15:30:00.000Z",
    guestName: "Борис",
    guestEmail: email("boris"),
  },
];

// The header row has column headers, a booking row has cells.
const cells = (row: HTMLElement) =>
  [...within(row).queryAllByRole("columnheader"), ...within(row).queryAllByRole("cell")].map(
    (cell) => cell.textContent,
  );

test("the table shows every booking in the server's order, in the owner's time zone", async () => {
  stubServer({ "GET /api/bookings": () => Response.json(bookings) });

  renderPage();

  const [header, ...rows] = await screen.findAllByRole("row");
  expect(cells(header)).toEqual(["Дата", "Время", "Тип встречи", "Имя", "Email"]);
  expect(rows.map(cells)).toEqual([
    ["чт, 19 ноября", "10:00–11:00", "Знакомство", "Анна", email("anna")],
    ["пт, 20 ноября", "17:00–18:30", "Ревью проекта", "Борис", email("boris")],
  ]);
  expect(screen.getByText("Московское время (UTC+3)")).toBeTruthy();
});

test("with no bookings the page says there are none and shows no table", async () => {
  stubServer({ "GET /api/bookings": () => Response.json([]) });

  renderPage();

  expect(await screen.findByText("Предстоящих бронирований нет")).toBeTruthy();
  expect(screen.queryByRole("table")).toBeNull();
});

test("the page shows a loading indicator until the server answers", async () => {
  let answer = (_response: Response) => {};
  stubServer({ "GET /api/bookings": () => new Promise((resolve) => (answer = resolve)) });

  renderPage();

  expect(await screen.findByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
  expect(screen.queryByText("Предстоящих бронирований нет")).toBeNull();

  answer(Response.json(bookings));

  expect(await screen.findByRole("table")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test.each([
  ["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ["a server error", () => Response.json({ message: "boom" }, { status: 500 })],
])("after %s the page asks to reload it and does not retry", async (_, answer) => {
  const fetch = stubServer({ "GET /api/bookings": answer });

  renderPage();

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByText("Предстоящих бронирований нет")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(1);
});
