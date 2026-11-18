import "@mantine/core/styles.css";
import { Container, MantineProvider, Text, Title } from "@mantine/core";

export default function App() {
  return (
    <MantineProvider>
      <Container py="xl">
        <Title>Календарь звонков</Title>
        <Text c="dimmed">Каркас приложения готов.</Text>
      </Container>
    </MantineProvider>
  );
}
