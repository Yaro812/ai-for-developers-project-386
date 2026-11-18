import { Anchor, Container, Stack, Title } from "@mantine/core";
import { Link } from "react-router";
import { useDocumentTitle } from "../useDocumentTitle.ts";

const title = "Страница не найдена";

export default function NotFoundPage() {
  useDocumentTitle(title);

  return (
    <Container component="main" py="xl">
      <Stack gap="lg" align="flex-start">
        <Title>{title}</Title>
        <Anchor component={Link} to="/">
          На главную
        </Anchor>
      </Stack>
    </Container>
  );
}
