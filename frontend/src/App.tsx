import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { BrowserRouter, Route, Routes } from "react-router";
import BookingPage from "./pages/BookingPage.tsx";
import EventTypeCatalogPage from "./pages/EventTypeCatalogPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import NewEventTypePage from "./pages/NewEventTypePage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";
import UpcomingBookingsPage from "./pages/UpcomingBookingsPage.tsx";

export default function App() {
  return (
    <MantineProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<EventTypeCatalogPage />} />
          <Route path="/book/:id" element={<BookingPage />} />
          <Route path="/owner/event-types/new" element={<NewEventTypePage />} />
          <Route path="/owner/bookings" element={<UpcomingBookingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}
