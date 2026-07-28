import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: () => {
      // Authentication is intentionally not connected in this UI-only iteration.
    },
  });

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="email"
        validators={{
          onBlur: ({ value }) => {
            if (!value) {
              return "Ingresa tu correo electronico.";
            }

            return emailPattern.test(value)
              ? undefined
              : "Ingresa un correo electronico valido.";
          },
        }}
      >
        {(field) => {
          const error =
            field.state.meta.isTouched && field.state.meta.errors[0];
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor={field.name}>
                Correo electronico
              </label>
              <input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="email"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="tu@empresa.com"
                type="email"
                value={field.state.value}
              />
              {error ? (
                <p
                  className="text-destructive text-sm"
                  id={errorId}
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name="password"
        validators={{
          onBlur: ({ value }) => (value ? undefined : "Ingresa tu contrasena."),
        }}
      >
        {(field) => {
          const error =
            field.state.meta.isTouched && field.state.meta.errors[0];
          const errorId = `${field.name}-error`;

          return (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <label className="font-medium text-sm" htmlFor={field.name}>
                  Contrasena
                </label>
                <Link
                  className="font-medium text-primary text-sm underline-offset-4 hover:underline"
                  to="/forgot-password"
                >
                  Olvide mi contrasena
                </Link>
              </div>
              <input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="current-password"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Ingresa tu contrasena"
                type="password"
                value={field.state.value}
              />
              {error ? (
                <p
                  className="text-destructive text-sm"
                  id={errorId}
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>

      <Button className="h-11 w-full" size="lg" type="submit">
        Iniciar sesion
      </Button>
    </form>
  );
}
