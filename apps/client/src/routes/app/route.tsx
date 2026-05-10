import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <section>
      <h2>Area protegida</h2>
      <Outlet />
    </section>
  );
}
