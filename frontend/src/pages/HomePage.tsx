import { Button, Container, List, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

export default function HomePage() {
  return (
    <Container py="xl">
      <Stack gap="lg" align="flex-start">
        <Title>Календарь звонков</Title>
        <Text size="lg">
          Забронируйте звонок с владельцем календаря без регистрации: выберите подходящий тип
          встречи и свободный слот в ближайшие две недели.
        </Text>
        <Title order={2}>Как это работает</Title>
        <List type="ordered" spacing="xs">
          <List.Item>Выберите тип встречи.</List.Item>
          <List.Item>Выберите день и свободный слот.</List.Item>
          <List.Item>Подтвердите бронирование.</List.Item>
        </List>
        <Button component={Link} to="/book" size="md">
          Записаться на звонок
        </Button>
      </Stack>
    </Container>
  );
}
