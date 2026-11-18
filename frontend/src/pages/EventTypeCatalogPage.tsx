import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router";
import { useDocumentTitle } from "../useDocumentTitle.ts";

const title = "Каталог типов встреч";

// Stub until booking is implemented: the guest will choose an event type here.
export default function EventTypeCatalogPage() {
  useDocumentTitle(title);

  return (
    <Container py="xl">
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
