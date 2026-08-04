import {
  type LoginPayload,
  loginSchema,
} from "@atlas/schemas/lib/auth/login.ts";
import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface LoginFormProps {
  onSubmitForm: (values: LoginPayload) => void;
}

function FormError({ error, id }: { error: string | false; id: string }) {
  return (
    <p
      className="min-h-5 text-destructive text-sm"
      id={id}
      role={error ? "alert" : undefined}
    >
      {error || null}
    </p>
  );
}

export function LoginForm({ onSubmitForm }: LoginFormProps) {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: ({ value }) => {
      onSubmitForm(value);
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
            return loginSchema.shape.email.safeParse(value).success
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
              <Input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="email"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="tu@empresa.com"
                type="email"
                value={field.state.value}
              />
              <FormError error={error} id={errorId} />
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
              <Input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="current-password"
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Ingresa tu contrasena"
                type="password"
                value={field.state.value}
              />
              <FormError error={error} id={errorId} />
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
