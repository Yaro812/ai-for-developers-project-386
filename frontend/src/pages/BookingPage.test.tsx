import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const noSlots = (date: string) => ({ date, slots: [] });

// Friday's slots are over and the weekend has none, so Monday is the first day with free slots.
const bookingWindow = [
  noSlots("2026-11-20"),
  noSlots("2026-11-21"),
  noSlots("2026-11-22"),
  {
    date: "2026-11-23",
    slots: [
      { start: "2026-11-23T06:00:00.000Z", end: "2026-11-23T07:30:00.000Z" },
      { start: "2026-11-23T06:15:00.000Z", end: "2026-11-23T07:45:00.000Z" },
      { start: "2026-11-23T13:30:00.000Z", end: "2026-11-23T15:00:00.000Z" },
    ],
  },
  {
    date: "2026-11-24",
    slots: [{ start: "2026-11-24T11:00:00.000Z", end: "2026-11-24T12:30:00.000Z" }],
  },
  ...[
    "2026-11-25",
    "2026-11-26",
    "2026-11-27",
    "2026-11-28",
    "2026-11-29",
    "2026-11-30",
    "2026-12-01",
    "2026-12-02",
    "2026-12-03",
  ].map(noSlots),
];

const eventTypeRoute = "GET /api/event-types/review-90";
const slotsRoute = "GET /api/event-types/review-90/slots";

// Answers both requests of the page; `routes` replaces either answer.
function stubBookingPage(routes: Parameters<typeof stubServer>[0] = {}) {
  return stubServer({
    [eventTypeRoute]: () => Response.json(reviewCall),
    [slotsRoute]: () => Response.json(bookingWindow),
    ...routes,
  });
}

// Day buttons are named by weekday and date, like «пт, 20 нояб.».
const dayButtons = () => screen.getAllByRole("button", { name: /нояб\.|дек\./ });
const pressed = (button: HTMLElement) => button.getAttribute("aria-pressed");

test("the page shows the 14 days of the window with the first day with free slots selected", async () => {
  stubBookingPage();

  renderBookingPage("review-90");

  expect(await screen.findByRole("button", { name: "пн, 23 нояб.", pressed: true })).toBeTruthy();
  expect(dayButtons().map((button) => [button.textContent, pressed(button)])).toEqual([
    ["пт, 20 нояб.", "false"],
    ["сб, 21 нояб.", "false"],
    ["вс, 22 нояб.", "false"],
    ["пн, 23 нояб.", "true"],
    ["вт, 24 нояб.", "false"],
    ["ср, 25 нояб.", "false"],
    ["чт, 26 нояб.", "false"],
    ["пт, 27 нояб.", "false"],
    ["сб, 28 нояб.", "false"],
    ["вс, 29 нояб.", "false"],
    ["пн, 30 нояб.", "false"],
    ["вт, 1 дек.", "false"],
    ["ср, 2 дек.", "false"],
    ["чт, 3 дек.", "false"],
  ]);
});

test("days without free slots are disabled buttons", async () => {
  stubBookingPage();

  renderBookingPage("review-90");

  await screen.findByRole("button", { name: "пн, 23 нояб.", pressed: true });
  expect(
    dayButtons()
      .filter((button) => !(button as HTMLButtonElement).disabled)
      .map((button) => button.textContent),
  ).toEqual(["пн, 23 нояб.", "вт, 24 нояб."]);
});

test("with no free slots in all 14 days the page says so and links to the catalog", async () => {
  stubBookingPage({
    [slotsRoute]: () => Response.json(bookingWindow.map(({ date }) => noSlots(date))),
  });

  renderBookingPage("review-90");

  expect(await screen.findByText("В ближайшие 14 дней свободного времени нет")).toBeTruthy();
  expect(screen.getByRole("link", { name: "К каталогу типов встреч" }).getAttribute("href")).toBe(
    "/book",
  );
  expect(
    dayButtons().map((button) => [(button as HTMLButtonElement).disabled, pressed(button)]),
  ).toEqual(Array(14).fill([true, "false"]));
  expect(slotButtons()).toEqual([]);
  expect(screen.queryByText("Московское время (UTC+3)")).toBeNull();
});

// Slot buttons are named by the start time, like «09:00».
const slotButtons = () => screen.queryAllByRole("button", { name: /^\d\d:\d\d$/ });

test("the selected day's slots show their start in Moscow time under the time zone caption", async () => {
  stubBookingPage();

  renderBookingPage("review-90");

  const caption = await screen.findByText("Московское время (UTC+3)");
  expect(slotButtons().map((button) => [button.textContent, pressed(button)])).toEqual([
    ["09:00", "false"],
    ["09:15", "false"],
    ["16:30", "false"],
  ]);
  expect(
    caption.compareDocumentPosition(slotButtons()[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("a clicked slot is selected, and another day resets it, all outside the URL", async () => {
  stubBookingPage();
  renderBookingPage("review-90");

  fireEvent.click(await screen.findByRole("button", { name: "09:15" }));

  expect(slotButtons().map(pressed)).toEqual(["false", "true", "false"]);

  fireEvent.click(screen.getByRole("button", { name: "вт, 24 нояб." }));

  expect(screen.getByRole("button", { name: "вт, 24 нояб.", pressed: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "пн, 23 нояб.", pressed: false })).toBeTruthy();
  expect(slotButtons().map((button) => [button.textContent, pressed(button)])).toEqual([
    ["14:00", "false"],
  ]);

  fireEvent.click(screen.getByRole("button", { name: "пн, 23 нояб." }));

  expect(slotButtons().map(pressed)).toEqual(["false", "false", "false"]);
  expect(window.location.pathname + window.location.search + window.location.hash).toBe(
    "/book/review-90",
  );
});

test("the header shows the event type title, duration and description with its line breaks", async () => {
  stubBookingPage();

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
  stubBookingPage({ [eventTypeRoute]: () => Response.json(eventType) });

  renderBookingPage("review-90");

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(screen.getByText("90 мин.")).toBeTruthy();
  expect(screen.getAllByRole("paragraph").map((paragraph) => paragraph.textContent)).not.toContain(
    "",
  );
});

test("the page requests the event type and its slots at once and shows only a loading indicator until both answer", async () => {
  let answerEventType = (_response: Response) => {};
  let answerSlots = (_response: Response) => {};
  const fetch = stubBookingPage({
    [eventTypeRoute]: () => new Promise((resolve) => (answerEventType = resolve)),
    [slotsRoute]: () => new Promise((resolve) => (answerSlots = resolve)),
  });

  renderBookingPage("review-90");

  // Both requests are out while neither has an answer.
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("progressbar", { name: "Загрузка" })).toBeTruthy();

  answerEventType(Response.json(reviewCall));
  // Nothing on the page signals that the first answer arrived, so the test gives it time to render.
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(screen.getByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
  expect(screen.queryByRole("heading")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();

  answerSlots(Response.json(bookingWindow));

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(dayButtons()).toHaveLength(14);
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("the guest opens the booking page from its catalog card", async () => {
  stubBookingPage({ "GET /api/event-types": () => Response.json([reviewCall]) });
  window.history.pushState({}, "", "/book");
  render(<App />);

  fireEvent.click(await screen.findByRole("link", { name: "Ревью проекта" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(window.location.pathname).toBe("/book/review-90");
  expect(document.title).toBe("Ревью проекта");
});

const networkError = () => Promise.reject(new TypeError("Failed to fetch"));
const serverError = () => Response.json({ message: "boom" }, { status: 500 });

test.each([
  ["a network error for the event type", eventTypeRoute, networkError],
  ["a server error for the event type", eventTypeRoute, serverError],
  ["a network error for the slots", slotsRoute, networkError],
  ["a server error for the slots", slotsRoute, serverError],
])("after %s the page asks to reload it and does not retry", async (_, route, answer) => {
  const fetch = stubBookingPage({ [route]: answer });

  renderBookingPage("review-90");

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
  expect(screen.queryByRole("heading")).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("an unknown event type says it is not found and links to the catalog on the same URL", async () => {
  const notFound = () =>
    Response.json(
      {
        statusCode: 404,
        code: "EVENT_TYPE_NOT_FOUND",
        error: "Not Found",
        message: "Event type missing not found",
      },
      { status: 404 },
    );
  stubServer({
    "GET /api/event-types/missing": notFound,
    "GET /api/event-types/missing/slots": notFound,
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
  expect(screen.queryByRole("button")).toBeNull();
});

// With `description`, finds the field only while that message stands under it.
const nameField = (description?: string) =>
  screen.getByRole("textbox", { name: "Имя", description }) as HTMLInputElement;
const emailField = (description?: string) =>
  screen.getByRole("textbox", { name: "Email", description }) as HTMLInputElement;
const bookButton = () => screen.queryByRole("button", { name: "Забронировать" });
const follows = (first: Node, second: Node) =>
  Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

test("a selected slot opens a form under the slots with the chosen day and time", async () => {
  stubBookingPage();
  renderBookingPage("review-90");
  await screen.findByText("Московское время (UTC+3)");

  expect(bookButton()).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "09:15" }));

  const summary = screen.getByText("пн, 23 ноября, 09:15–10:45");
  expect(follows(slotButtons().at(-1)!, summary)).toBe(true);
  expect(nameField().value).toBe("");
  expect(emailField().value).toBe("");
  expect(follows(emailField(), bookButton()!)).toBe(true);
});

// Fake guest addresses on the reserved example.com domain.
const email = (local: string) => `${local}@example.com`;

function fillGuest(name: string, address: string) {
  fireEvent.change(nameField(), { target: { value: name } });
  fireEvent.change(emailField(), { target: { value: address } });
}

test("another day hides the form, and the name and email return with the next slot", async () => {
  stubBookingPage();
  renderBookingPage("review-90");
  fireEvent.click(await screen.findByRole("button", { name: "09:15" }));
  fillGuest("Анна", email("anna"));

  fireEvent.click(screen.getByRole("button", { name: "вт, 24 нояб." }));

  expect(bookButton()).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "14:00" }));

  expect(screen.getByText("вт, 24 ноября, 14:00–15:30")).toBeTruthy();
  expect([nameField().value, emailField().value]).toEqual(["Анна", email("anna")]);
});

async function openForm(routes: Parameters<typeof stubServer>[0] = {}) {
  const fetch = stubBookingPage(routes);
  renderBookingPage("review-90");
  fireEvent.click(await screen.findByRole("button", { name: "09:15" }));
  return fetch;
}

const bookingRoute = "POST /api/event-types/review-90/bookings";
const bookRequests = (fetch: ReturnType<typeof stubServer>) =>
  fetch.mock.calls.filter(([request]) => request.method === "POST");

test.each([
  ["an empty name", "", email("anna"), "name", "Укажите имя"],
  ["a name of spaces only", "   ", email("anna"), "name", "Укажите имя"],
  ["an email without @", "Анна", "anna", "email", "Неверный формат email"],
  ["an email without a domain", "Анна", "anna@", "email", "Неверный формат email"],
  ["an email with a space inside", "Анна", email("an na"), "email", "Неверный формат email"],
] as const)(
  "%s shows a message under its field and sends nothing",
  async (_, name, address, key, message) => {
    const fetch = await openForm();

    fillGuest(name, address);
    fireEvent.click(bookButton()!);

    expect((key === "name" ? nameField : emailField)(message)).toBeTruthy();
    expect(bookRequests(fetch)).toEqual([]);
  },
);

// The server's answer for the selected Monday 09:15 slot.
const booking = {
  eventType: reviewCall,
  start: "2026-11-23T06:15:00.000Z",
  end: "2026-11-23T07:45:00.000Z",
  guestName: "Анна",
  guestEmail: email("anna"),
};
const booked = () => Response.json(booking, { status: 201 });

test("a booking sends the trimmed values, and its confirmation replaces the days, slots and form", async () => {
  let sent: unknown;
  await openForm({
    [bookingRoute]: async (request) => {
      sent = await request.json();
      return booked();
    },
  });

  fillGuest("  Анна ", ` ${email("anna")}  `);
  fireEvent.click(bookButton()!);

  const confirmation = await screen.findByRole("region", { name: "Звонок забронирован" });
  expect(sent).toEqual({
    start: "2026-11-23T06:15:00.000Z",
    guestName: "Анна",
    guestEmail: email("anna"),
  });
  expect(within(confirmation).getByRole("heading", { name: "Звонок забронирован" })).toBeTruthy();
  for (const text of [
    "Ревью проекта",
    "пн, 23 ноября, 09:15–10:45",
    "Московское время (UTC+3)",
    "Анна",
    email("anna"),
  ]) {
    expect(within(confirmation).getByText(text)).toBeTruthy();
  }
  expect(
    within(confirmation)
      .getByRole("link", { name: "К каталогу типов встреч" })
      .getAttribute("href"),
  ).toBe("/book");
  // The header stays; the choice and the form are gone.
  expect(screen.getByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
  expect(screen.getByText("90 мин.")).toBeTruthy();
  expect(screen.queryAllByRole("button")).toEqual([]);
  expect(screen.queryAllByRole("textbox")).toEqual([]);
});

test("the book button is disabled while the request runs", async () => {
  let answer = (_response: Response) => {};
  const fetch = await openForm({
    [bookingRoute]: () => new Promise((resolve) => (answer = resolve)),
  });

  fillGuest("Анна", email("anna"));
  fireEvent.click(bookButton()!);
  await waitFor(() => expect(bookRequests(fetch)).toHaveLength(1));

  expect((bookButton() as HTMLButtonElement).disabled).toBe(true);

  answer(booked());

  expect(await screen.findByRole("region", { name: "Звонок забронирован" })).toBeTruthy();
});

const apiError = (statusCode: number, code: string, error: string) => () =>
  Response.json({ statusCode, code, error, message: "Refused" }, { status: statusCode });
const conflict = apiError(409, "BOOKING_CONFLICT", "Conflict");
const unavailable = apiError(422, "TIME_UNAVAILABLE", "Unprocessable Entity");

const [friday, saturday, sunday, monday, tuesday, ...rest] = bookingWindow;
// After the refusal Monday still has free slots, but no longer 09:15.
const windowWithoutMonday0915 = [
  friday,
  saturday,
  sunday,
  { ...monday, slots: monday.slots.filter(({ start }) => start !== "2026-11-23T06:15:00.000Z") },
  tuesday,
  ...rest,
];

// The first slots request answers at once; the reload after a refusal waits for `answerReload`.
function slotsThenReload() {
  let answerReload = (_window: unknown) => {};
  let calls = 0;
  const route = () => {
    calls += 1;
    if (calls === 1) return Response.json(bookingWindow);
    return new Promise<Response>((resolve) => {
      answerReload = (window) => resolve(Response.json(window));
    });
  };
  return { route, reload: (window: unknown) => answerReload(window), calls: () => calls };
}

test.each([
  ["a booking conflict", conflict, "Это время уже занято, выберите другой слот"],
  ["unavailable time", unavailable, "Это время больше недоступно, выберите другой слот"],
])(
  "after %s the page says so above the days, reloads the slots and keeps the day and the input",
  async (_, refusal, message) => {
    const slots = slotsThenReload();
    await openForm({ [slotsRoute]: slots.route, [bookingRoute]: refusal });
    fillGuest("Анна", email("anna"));

    fireEvent.click(bookButton()!);

    const notice = await screen.findByText(message);
    // The slots are reloading: an indicator stands in place of the days and slots, the header stays.
    expect(screen.getByRole("progressbar", { name: "Загрузка" })).toBeTruthy();
    expect(screen.queryAllByRole("button")).toEqual([]);
    expect(screen.getByRole("heading", { level: 1, name: "Ревью проекта" })).toBeTruthy();
    expect(slots.calls()).toBe(2);

    slots.reload(windowWithoutMonday0915);

    expect(await screen.findByRole("button", { name: "пн, 23 нояб.", pressed: true })).toBeTruthy();
    expect(follows(notice, dayButtons()[0])).toBe(true);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(slotButtons().map((button) => [button.textContent, pressed(button)])).toEqual([
      ["09:00", "false"],
      ["16:30", "false"],
    ]);
    expect(bookButton()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "09:00" }));

    expect(screen.queryByText(message)).toBeNull();
    expect([nameField().value, emailField().value]).toEqual(["Анна", email("anna")]);
  },
);

// The guest picked Tuesday, not the default Monday, before the refusal.
test.each([
  [
    "a day with free slots left stays selected",
    [{ start: "2026-11-24T12:00:00.000Z", end: "2026-11-24T13:30:00.000Z" }],
    "вт, 24 нояб.",
  ],
  ["a day left without free slots gives way to the first day with them", [], "пн, 23 нояб."],
])("after a refusal %s", async (_, tuesdaySlots, selectedDay) => {
  const slots = slotsThenReload();
  stubBookingPage({ [slotsRoute]: slots.route, [bookingRoute]: conflict });
  renderBookingPage("review-90");
  fireEvent.click(await screen.findByRole("button", { name: "вт, 24 нояб." }));
  fireEvent.click(screen.getByRole("button", { name: "14:00" }));
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);
  await screen.findByText("Это время уже занято, выберите другой слот");
  slots.reload([friday, saturday, sunday, monday, { ...tuesday, slots: tuesdaySlots }, ...rest]);

  expect(await screen.findByRole("button", { name: selectedDay, pressed: true })).toBeTruthy();
  expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
});

test("after a refusal with no free slots left the page says there is no free time", async () => {
  const slots = slotsThenReload();
  await openForm({ [slotsRoute]: slots.route, [bookingRoute]: conflict });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);
  await screen.findByText("Это время уже занято, выберите другой слот");
  slots.reload(bookingWindow.map(({ date }) => noSlots(date)));

  expect(await screen.findByText("В ближайшие 14 дней свободного времени нет")).toBeTruthy();
  expect(slotButtons()).toEqual([]);
  expect(bookButton()).toBeNull();
});

test("after a refusal a failed reload of the slots asks to reload the page", async () => {
  let calls = 0;
  await openForm({
    [slotsRoute]: () => (++calls === 1 ? Response.json(bookingWindow) : serverError()),
    [bookingRoute]: conflict,
  });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);

  expect(await screen.findByText("Не удалось загрузить страницу, обновите её")).toBeTruthy();
  expect(screen.queryByRole("progressbar")).toBeNull();
});

test("a data error found by the server is reported and the values stay", async () => {
  await openForm({ [bookingRoute]: apiError(400, "FST_ERR_VALIDATION", "Bad Request") });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);

  expect(
    await screen.findByText("Не удалось сохранить бронирование, проверьте данные"),
  ).toBeTruthy();
  expect(screen.getByText("пн, 23 ноября, 09:15–10:45")).toBeTruthy();
  expect([nameField().value, emailField().value]).toEqual(["Анна", email("anna")]);
});

test("an event type gone while booking says it no longer exists and links to the catalog, without the header", async () => {
  await openForm({ [bookingRoute]: apiError(404, "EVENT_TYPE_NOT_FOUND", "Not Found") });
  fillGuest("Анна", email("anna"));

  fireEvent.click(bookButton()!);

  expect(
    await screen.findByRole("heading", {
      level: 1,
      name: "Этот тип встречи больше не существует",
    }),
  ).toBeTruthy();
  expect(document.title).toBe("Этот тип встречи больше не существует");
  expect(screen.getByRole("link", { name: "К каталогу типов встреч" }).getAttribute("href")).toBe(
    "/book",
  );
  expect(screen.queryByText("Ревью проекта")).toBeNull();
  expect(screen.queryByText("90 мин.")).toBeNull();
  expect(screen.queryAllByRole("button")).toEqual([]);
  expect(screen.queryAllByRole("textbox")).toEqual([]);
});
