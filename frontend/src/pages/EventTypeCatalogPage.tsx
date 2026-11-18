import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

// Stub until booking is implemented: the guest will choose an event type here.
export default function EventTypeCatalogPage() {
  return (
    <Container py="xl">
      <Stack gap="lg" align="flex-start">
        <Title>Каталог типов встреч</Title>
        <Text>Скоро здесь можно будет выбрать тип встречи.</Text>
        <Anchor component={Link} to="/">
          На главную
        </Anchor>
      </Stack>
    </Container>
  );
}
