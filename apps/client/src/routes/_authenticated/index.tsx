import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <section>
      <h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
      <p className="mt-2 text-muted-foreground text-sm">Bienvenido a Atlas.</p>
    </section>
  );
}
