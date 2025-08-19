// src/pages/EventsPage.jsx
import useEventos from "../hooks/useEventos"; // ruta al hook
import EventsTable from "../components/EventsTable"; // ajustá la ruta según tu estructura

export default function EventsPage() {
  const eventos = useEventos(); // 👈 llega siempre actualizado
  return <EventsTable eventos={eventos} />;
}
