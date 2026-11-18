// Moments come in UTC; pages show them in the owner's time zone, whatever the browser's is.
const ownerTimeZone = "Europe/Moscow";

// «10:00».
export const clockTime = new Intl.DateTimeFormat("ru", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ownerTimeZone,
});

// «пт, 20 ноября».
export const longDay = new Intl.DateTimeFormat("ru", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: ownerTimeZone,
});

// «10:00–11:00».
export const timeRange = ({ start, end }: { start: string; end: string }) =>
  `${clockTime.format(new Date(start))}–${clockTime.format(new Date(end))}`;
