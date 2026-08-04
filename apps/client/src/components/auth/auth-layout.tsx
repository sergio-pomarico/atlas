import type { ReactNode } from "react";

import { FloatingPaths } from "@/components/ui/floating-paths";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-sm">{children}</div>
      </section>
      <aside className="relative hidden overflow-hidden bg-primary px-12 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />
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
