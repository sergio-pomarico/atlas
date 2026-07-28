import { createFileRoute } from "@tanstack/react-router";

import { LoginForm } from "@/components/auth/login-form";
import { BackgroundBeams } from "@/components/ui/background-beams";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-sm">
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
              <span className="font-semibold text-lg tracking-tight">
                Atlas
              </span>
            </div>
            <h1 className="font-semibold text-3xl tracking-tight">
              Bienvenido de nuevo
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Ingresa tus credenciales para acceder a tu operacion.
            </p>
          </div>

          <LoginForm />
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-primary px-12 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <BackgroundBeams className="opacity-40" />
        <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:4rem_4rem]" />
        <div className="relative">
          <p className="font-medium text-sm uppercase tracking-[0.2em]">
            Distribucion que conecta
          </p>
          <h2 className="mt-5 max-w-lg font-semibold text-4xl leading-tight tracking-tight xl:text-5xl">
            La salud llega mas lejos cuando cada entrega esta bajo control.
          </h2>
        </div>

        <figure className="relative max-w-md">
          <div aria-hidden="true" className="mb-6 flex gap-2">
            <span className="size-2 rounded-full bg-primary-foreground" />
            <span className="size-2 rounded-full bg-primary-foreground/50" />
            <span className="size-2 rounded-full bg-primary-foreground/50" />
          </div>
          <blockquote className="text-lg leading-relaxed">
            "Cada entrega exige visibilidad, trazabilidad y la confianza de que
            los medicamentos llegan a tiempo."
          </blockquote>
          <figcaption className="mt-5 text-primary-foreground/70 text-sm">
            Atlas para distribuidores farmaceuticos
          </figcaption>
        </figure>
      </aside>
    </main>
  );
}
