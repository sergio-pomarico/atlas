import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/auth-layout";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <AuthLayout>
      <h2>Recuperar contrasena</h2>
      <p>Esta ruta es publica.</p>
      <Link to="/login">Volver a iniciar sesion</Link>
    </AuthLayout>
  );
}
