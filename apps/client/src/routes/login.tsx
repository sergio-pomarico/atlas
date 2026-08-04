import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <AuthLayout>
      <div className="mb-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 4v16M4 12h16"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="2"
              />
            </svg>
          </span>
          <span className="font-semibold text-lg tracking-tight">Atlas</span>
        </div>
        <h1 className="font-semibold text-3xl tracking-tight">
          Bienvenido de nuevo
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Ingresa tus credenciales para acceder a tu operacion.
        </p>
      </div>
      <LoginForm />
    </AuthLayout>
  );
}
