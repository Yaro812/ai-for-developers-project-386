import { Anchor, Container, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listUpcomingBookings } from "../generated/sdk.gen.ts";
import type { Booking } from "../generated/types.gen.ts";
import { longDay, timeRange } from "../owner-time.ts";

const title = "Предстоящие бронирования";

export default function UpcomingBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>();
  const [failed, setFailed] = useState(false);

  // Loads once on open; the owner reloads the page to see new bookings or after an error.
  useEffect(() => {
    listUpcomingBookings().then(({ data, error }) => (error ? setFailed(true) : setBookings(data)));
  }, []);

  return (
    <Container component="main" py="xl">
      <title>{title}</title>
      <Stack gap="lg" align="flex-start">
        <Title>{title}</Title>
        {failed && <Text>Не удалось загрузить страницу, обновите её</Text>}
        {!bookings && !failed && <Loader role="progressbar" aria-label="Загрузка" />}
        {bookings?.length === 0 && <Text>Предстоящих бронирований нет</Text>}
        {!!bookings?.length && (
          <>
            <Text>Московское время (UTC+3)</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Время</Table.Th>
                  <Table.Th>Тип встречи</Table.Th>
                  <Table.Th>Имя</Table.Th>
                  <Table.Th>Email</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {/* The server sends bookings by start; `start` is unique, as bookings never overlap. */}
                {bookings.map((booking) => (
                  <Table.Tr key={booking.start}>
                    <Table.Td>{longDay.format(new Date(booking.start))}</Table.Td>
                    <Table.Td>{timeRange(booking)}</Table.Td>
                    <Table.Td>{booking.eventType.title}</Table.Td>
                    <Table.Td>{booking.guestName}</Table.Td>
                    <Table.Td>{booking.guestEmail}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </>
        )}
        <Anchor component={Link} to="/owner/event-types/new">
          Новый тип встречи
        </Anchor>
      </Stack>
    </Container>
  );
}
