import type { LoginPayload } from "@atlas/schemas/lib/auth/login.ts";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import type { AuthServiceError, LoginResult } from "@/services/auth-service";
import { authService } from "@/services/auth-service";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const router = useRouter();
  const navigate = useNavigate();
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const showError = useUIStore((state) => state.showError);
  const { mutate } = useMutation<LoginResult, AuthServiceError, LoginPayload>({
    mutationFn: (values) => authService.login(values),
    onSuccess: async ({ accessToken }) => {
      setAccessToken(accessToken);
      await router.invalidate();
      await navigate({ to: "/dashboard" });
    },
    onError: (error) => showError(error.message),
  });
  const onSubmit = (values: LoginPayload) => mutate(values);
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
      <LoginForm onSubmitForm={onSubmit} />
    </AuthLayout>
  );
}
