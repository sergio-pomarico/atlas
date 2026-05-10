import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <section>
      <h2>Login</h2>
      <p>Acceso publico. La autenticacion se integrara mas adelante.</p>
      <Link to="/app">Ir al area protegida</Link>
    </section>
  );
}
