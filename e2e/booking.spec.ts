import { expect, test } from "@playwright/test";

// Fake guest addresses on the reserved example.com domain.
const email = (local: string) => `${local}@example.com`;
const guestEmail = email("anna");

// The path from README on real clocks: the server starts empty for every run, and the date is not set.
test("the owner creates an event type, a guest books it, the owner sees the booking", async ({
  page,
}) => {
  await page.goto("/owner/event-types/new");
  await page.getByRole("textbox", { name: "id", exact: true }).fill("intro-30");
  await page.getByRole("textbox", { name: "Название" }).fill("Знакомство");
  await page.getByRole("spinbutton", { name: "Длительность, мин." }).fill("30");
  await page.getByRole("button", { name: "Создать" }).click();
  await expect(page.getByRole("link", { name: /\/book\/intro-30$/ })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Записаться на звонок" }).click();
  await page.getByRole("link", { name: "Знакомство" }).click();
  // Day buttons read «чт, 19 нояб., свободно: 35», slot buttons «10:00–10:30 Свободно».
  await page
    .getByRole("button", { name: /^\S+, \d+ \S+, свободно/, disabled: false })
    .first()
    .click();
  const slot = page.getByRole("button", { name: /^\d\d:\d\d–\d\d:\d\d/ }).first();
  const slotName = await slot.textContent();
  await slot.click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("textbox", { name: "Имя" }).fill("Анна");
  await page.getByRole("textbox", { name: "Email" }).fill(guestEmail);
  await page.getByRole("button", { name: "Подтвердить бронирование" }).click();
  await expect(
    page.getByRole("heading", { name: "Бронирование подтверждено. До встречи!" }),
  ).toBeVisible();

  // The booked slot stays in the list and is no longer free.
  await page.getByRole("button", { name: "Забронировать ещё" }).click();
  await expect(
    page.getByRole("button", { name: slotName!.replace("Свободно", " Занято") }),
  ).toBeDisabled();

  await page.getByRole("link", { name: "Предстоящие бронирования" }).click();
  await expect(
    page.getByRole("article").filter({ hasText: "Знакомство" }).filter({ hasText: guestEmail }),
  ).toContainText("Анна");
});
