import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/")({
  component: AppIndex,
});

function AppIndex() {
  return (
    <section>
      <p>Dashboard protegido</p>
      <Link to="/">Volver al home</Link>
    </section>
  );
}
