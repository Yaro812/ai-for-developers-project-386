import {
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getEventType, listSlots } from "../generated/sdk.gen.ts";
import type { BookingWindowDay, EventType } from "../generated/types.gen.ts";

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

export default function BookingPage() {
  const { id = "" } = useParams();
  const [eventType, setEventType] = useState<EventType>();
  const [days, setDays] = useState<BookingWindowDay[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  // The choice lives only in the page state, never in the URL.
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedStart, setSelectedStart] = useState<string>();

  // Both requests start at once and the page waits for both; it loads once on open,
  // and after a network or server error the guest reloads the page.
  useEffect(() => {
    const path = { id };
    Promise.all([getEventType({ path }), listSlots({ path })]).then(
      ([eventTypeAnswer, slotsAnswer]) => {
        if (eventTypeAnswer.error?.code === "EVENT_TYPE_NOT_FOUND") {
          setNotFound(true);
        } else if (eventTypeAnswer.data && slotsAnswer.data) {
          setEventType(eventTypeAnswer.data);
          setDays(slotsAnswer.data);
        } else {
          setFailed(true);
        }
      },
    );
  }, [id]);

  // The dates come from the server, never from the browser clock; until the guest picks a day,
  // the first day with free slots is selected.
  const day =
    days.find(({ date }) => date === selectedDate) ?? days.find(({ slots }) => slots.length > 0);
  const heading = notFound ? "Тип встречи не найден" : eventType?.title;

  return (
    <Container component="main" py="xl">
      {failed && <Text>Не удалось загрузить страницу, обновите её</Text>}
      {!heading && !failed && <Loader role="progressbar" aria-label="Загрузка" />}
      {heading && (
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
          {eventType && (
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
          )}
          {/* The header keeps the link to the catalog. */}
          {eventType && !day && <Text>В ближайшие 14 дней свободного времени нет</Text>}
          {day && (
            <Stack gap="xs">
              <Text>Московское время (UTC+3)</Text>
              <SimpleGrid cols={{ base: 3, xs: 4, sm: 6 }}>
                {day.slots.map(({ start }) => (
                  <Button
                    key={start}
                    variant={start === selectedStart ? "filled" : "default"}
                    aria-pressed={start === selectedStart}
                    onClick={() => setSelectedStart(start)}
                  >
                    {startTime.format(new Date(start))}
                  </Button>
                ))}
              </SimpleGrid>
            </Stack>
          )}
        </Stack>
      )}
    </Container>
  );
}
