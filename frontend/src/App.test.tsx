import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App.tsx";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  render(<App />);
}

test("home page invites the guest to book a call", () => {
  renderAt("/");

  expect(screen.getByRole("heading", { level: 1, name: "Календарь звонков" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Записаться на звонок" }).getAttribute("href")).toBe(
    "/book",
  );
});

test("booking link opens the event type catalog", () => {
  renderAt("/");

  fireEvent.click(screen.getByRole("link", { name: "Записаться на звонок" }));

  expect(screen.getByRole("heading", { level: 1, name: "Каталог типов встреч" })).toBeTruthy();
  expect(window.location.pathname).toBe("/book");
});
