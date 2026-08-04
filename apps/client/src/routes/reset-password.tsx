import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/auth-layout";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  return (
    <AuthLayout>
      <h2>Restablecer contrasena</h2>
      <p>Esta ruta es publica.</p>
      <Link to="/login">Volver a iniciar sesion</Link>
    </AuthLayout>
  );
}
