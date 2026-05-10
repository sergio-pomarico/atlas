import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div>
      <header>
        <h1>Atlas</h1>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
