import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Route, Routes } from "react-router";
import EventTypeCatalogPage from "./pages/EventTypeCatalogPage.tsx";
import HomePage from "./pages/HomePage.tsx";

export default function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<EventTypeCatalogPage />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
