import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { createBooking, getEventType, listSlots } from "../generated/sdk.gen.ts";
import type { Booking, BookingWindowDay, EventType, Slot } from "../generated/types.gen.ts";

// A window day is a plain date in the owner's time zone; read at UTC midnight, it formats back to itself in UTC.
const dayLabel = new Intl.DateTimeFormat("ru", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
// Slot moments come in UTC; the guest sees them in the owner's time zone, whatever the browser's is.
const ownerTimeZone = "Europe/Moscow";
const startTime = new Intl.DateTimeFormat("ru", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ownerTimeZone,
});
const longDay = new Intl.DateTimeFormat("ru", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: ownerTimeZone,
});
// «пт, 20 ноября, 10:00–11:00» in the owner's time zone.
const interval = ({ start, end }: Slot) =>
  `${longDay.format(new Date(start))}, ${startTime.format(new Date(start))}–${startTime.format(new Date(end))}`;

type Guest = { name: string; email: string };

const refusals = {
  BOOKING_CONFLICT: "Это время уже занято, выберите другой слот",
  TIME_UNAVAILABLE: "Это время больше недоступно, выберите другой слот",
};

// The contract's rules for the guest, checked on trimmed values before sending;
// the fields cap the lengths, and the server checks everything again.
function check({ name, email }: Guest) {
  const errors: Partial<Guest> = {};
  if (!name) errors.name = "Укажите имя";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Неверный формат email";
  return errors;
}

export default function BookingPage() {
  const { id = "" } = useParams();
  const [eventType, setEventType] = useState<EventType>();
  // Undefined while the slots load.
  const [days, setDays] = useState<BookingWindowDay[]>();
  // The heading of the screen that replaces the page when the event type does not exist.
  const [missing, setMissing] = useState<string>();
  const [failed, setFailed] = useState(false);
  // The choice lives only in the page state, never in the URL.
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedStart, setSelectedStart] = useState<string>();
  // The guest's input outlives the form, so another day or slot keeps it.
  const [guest, setGuest] = useState<Guest>({ name: "", email: "" });
  const [errors, setErrors] = useState<Partial<Guest>>({});
  const [pending, setPending] = useState(false);
  const [booking, setBooking] = useState<Booking>();
  const [saveFailed, setSaveFailed] = useState(false);
  // Why the server refused the chosen slot; gone once the guest picks another.
  const [refusal, setRefusal] = useState<string>();

  // Both requests start at once and the page waits for both; it loads once on open,
  // and after a network or server error the guest reloads the page.
  useEffect(() => {
    const path = { id };
    Promise.all([getEventType({ path }), listSlots({ path })]).then(
      ([eventTypeAnswer, slotsAnswer]) => {
        if (eventTypeAnswer.error?.code === "EVENT_TYPE_NOT_FOUND") {
          setMissing("Тип встречи не найден");
        } else if (eventTypeAnswer.data && slotsAnswer.data) {
          setEventType(eventTypeAnswer.data);
          setDays(slotsAnswer.data);
        } else {
          setFailed(true);
        }
      },
    );
  }, [id]);

  // The dates come from the server, never from the browser clock. The guest's day stays while it
  // has free slots; otherwise, and until the guest picks one, the first day with free slots is selected.
  const hasSlots = ({ slots }: BookingWindowDay) => slots.length > 0;
  const day =
    days?.find((day) => day.date === selectedDate && hasSlots(day)) ?? days?.find(hasSlots);
  const slot = day?.slots.find(({ start }) => start === selectedStart);
  const heading = missing ?? eventType?.title;

  const guestField = (key: keyof Guest) => ({
    value: guest[key],
    error: errors[key],
    onChange: ({ currentTarget }: ChangeEvent<HTMLInputElement>) =>
      setGuest((guest) => ({ ...guest, [key]: currentTarget.value })),
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = { name: guest.name.trim(), email: guest.email.trim() };
    const found = check(trimmed);
    setErrors(found);
    setSaveFailed(false);
    if (!slot || Object.keys(found).length > 0) return;

    setPending(true);
    const { data, error } = await createBooking({
      path: { id },
      body: { start: slot.start, guestName: trimmed.name, guestEmail: trimmed.email },
    });
    setPending(false);
    if (data) {
      setBooking(data);
    } else if (error?.code === "BOOKING_CONFLICT" || error?.code === "TIME_UNAVAILABLE") {
      // The slot is gone: the page shows why and fresh slots; the input stays for the next slot.
      setRefusal(refusals[error.code]);
      setSelectedStart(undefined);
      setDays(undefined);
      const slotsAnswer = await listSlots({ path: { id } });
      if (slotsAnswer.data) setDays(slotsAnswer.data);
      else setFailed(true);
    } else if (error?.code === "EVENT_TYPE_NOT_FOUND") {
      // The event type vanished, e.g. after a server restart: the screen keeps no header.
      setMissing("Этот тип встречи больше не существует");
      setEventType(undefined);
    } else {
      setSaveFailed(true);
    }
  }

  return (
    <Container component="main" py="xl">
      {failed && <Text>Не удалось загрузить страницу, обновите её</Text>}
      {!heading && !failed && <Loader role="progressbar" aria-label="Загрузка" />}
      {heading && !failed && (
        <Stack gap="lg" align="flex-start">
          <title>{heading}</title>
          <Title>{heading}</Title>
          {eventType && <Text>{eventType.durationMinutes} мин.</Text>}
          {eventType?.description && (
            <Text style={{ whiteSpace: "pre-wrap" }}>{eventType.description}</Text>
          )}
          <Anchor component={Link} to="/book">
            К каталогу типов встреч
          </Anchor>
          {booking && (
            <Stack component="section" aria-labelledby="booked" gap="xs">
              <Title order={2} id="booked">
                Звонок забронирован
              </Title>
              <Text>{booking.eventType.title}</Text>
              <Text>{interval(booking)}</Text>
              <Text>Московское время (UTC+3)</Text>
              <Text>{booking.guestName}</Text>
              <Text>{booking.guestEmail}</Text>
              <Anchor component={Link} to="/book">
                К каталогу типов встреч
              </Anchor>
            </Stack>
          )}
          {refusal && <Alert color="yellow">{refusal}</Alert>}
          {eventType && !days && <Loader role="progressbar" aria-label="Загрузка" />}
          {/* The confirmation replaces the choice of day and slot. */}
          {eventType && days && !booking && (
            <>
              <Group gap="xs">
                {days.map(({ date, slots }) => (
                  <Button
                    key={date}
                    variant={date === day?.date ? "filled" : "default"}
                    aria-pressed={date === day?.date}
                    disabled={slots.length === 0}
                    onClick={() => {
                      setSelectedDate(date);
                      setSelectedStart(undefined);
                    }}
                  >
                    {dayLabel.format(new Date(date))}
                  </Button>
                ))}
              </Group>
              {/* The header keeps the link to the catalog. */}
              {!day && <Text>В ближайшие 14 дней свободного времени нет</Text>}
              {day && (
                <Stack gap="xs">
                  <Text>Московское время (UTC+3)</Text>
                  <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }}>
                    {day.slots.map(({ start }) => (
                      <Button
                        key={start}
                        variant={start === selectedStart ? "filled" : "default"}
                        aria-pressed={start === selectedStart}
                        onClick={() => {
                          setSelectedStart(start);
                          setRefusal(undefined);
                        }}
                      >
                        {startTime.format(new Date(start))}
                      </Button>
                    ))}
                  </SimpleGrid>
                </Stack>
              )}
              {slot && (
                // noValidate: the page shows its own messages instead of the browser's.
                <form noValidate onSubmit={submit}>
                  <Stack gap="md">
                    <Text>{interval(slot)}</Text>
                    <TextInput label="Имя" maxLength={100} {...guestField("name")} />
                    <TextInput
                      label="Email"
                      type="email"
                      maxLength={254}
                      {...guestField("email")}
                    />
                    {saveFailed && (
                      <Alert color="red">Не удалось сохранить бронирование, проверьте данные</Alert>
                    )}
                    <Group>
                      <Button type="submit" loading={pending}>
                        Забронировать
                      </Button>
                    </Group>
                  </Stack>
                </form>
              )}
            </>
          )}
        </Stack>
      )}
    </Container>
  );
}
