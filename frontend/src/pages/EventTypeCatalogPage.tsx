import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";

const title = "Каталог типов встреч";

// Stub until booking is implemented: the guest will choose an event type here.
export default function EventTypeCatalogPage() {
  return (
    <Container component="main" py="xl">
      <title>{title}</title>
      <Stack gap="lg" align="flex-start">
        <Title>{title}</Title>
        <Text>Скоро здесь можно будет выбрать тип встречи.</Text>
        <Anchor component={Link} to="/">
          На главную
        </Anchor>
      </Stack>
    </Container>
  );
}
