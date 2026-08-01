import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  return (
    <section>
      <h2>Restablecer contrasena</h2>
      <p>Esta ruta es publica.</p>
      <Link to="/login">Volver a iniciar sesion</Link>
    </section>
  );
}
