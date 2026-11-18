import { Anchor, Container, Loader, Stack, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { getEventType } from "../generated/sdk.gen.ts";
import type { EventType } from "../generated/types.gen.ts";

export default function BookingPage() {
  const { id = "" } = useParams();
  const [eventType, setEventType] = useState<EventType>();
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);

  // Loads once on open; after a network or server error the guest reloads the page.
  useEffect(() => {
    getEventType({ path: { id } }).then(({ data, error }) => {
      if (data) setEventType(data);
      else if (error?.code === "EVENT_TYPE_NOT_FOUND") setNotFound(true);
      else setFailed(true);
    });
  }, [id]);

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
        </Stack>
      )}
    </Container>
  );
}
