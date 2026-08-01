import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  return (
    <section>
      <p>Dashboard protegido</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}
