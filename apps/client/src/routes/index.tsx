import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <section className="space-y-6">
      <p>Home</p>
      <nav className="flex gap-3">
        <Button asChild>
          <Link to="/login">Login</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app">App</Link>
        </Button>
      </nav>
    </section>
  );
}
