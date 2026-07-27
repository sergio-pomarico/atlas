import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

export type RouterContext = {
  auth: {
    isAuthenticated: boolean;
  };
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return <Outlet />;
}
