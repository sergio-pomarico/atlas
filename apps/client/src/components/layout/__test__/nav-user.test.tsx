import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearQueryCache: vi.fn(),
  clearSession: vi.fn(),
  invalidate: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  logout: vi.fn(),
  mutate: vi.fn(),
  mutationOptions: undefined as
    | {
        mutationFn?: () => Promise<void>;
        onSettled?: (data: undefined, error: Error | null) => Promise<void>;
      }
    | undefined,
  navigate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: vi.fn((options) => {
    mocks.mutationOptions = options;
    return { isPending: mocks.isPending, mutate: mocks.mutate };
  }),
  useQueryClient: () => ({ clear: mocks.clearQueryCache }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ invalidate: mocks.invalidate }),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: "dropdown-menu",
  DropdownMenuContent: "dropdown-menu-content",
  DropdownMenuGroup: "dropdown-menu-group",
  DropdownMenuItem: () => null,
  DropdownMenuLabel: "dropdown-menu-label",
  DropdownMenuSeparator: "dropdown-menu-separator",
  DropdownMenuTrigger: "dropdown-menu-trigger",
}));

vi.mock("@/services/auth-service", () => ({
  authService: { logout: mocks.logout },
}));

vi.mock("@/stores/auth-store", () => ({
  useAuthStore: (selector: (state: { clearSession: () => void }) => unknown) =>
    selector({ clearSession: mocks.clearSession }),
}));

import { NavUser } from "../nav-user";

interface DropdownMenuItemProps {
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  variant?: string;
}

function findLogoutItem(
  node: ReactNode
): ReactElement<DropdownMenuItemProps> | undefined {
  if (!isValidElement<DropdownMenuItemProps>(node)) {
    return undefined;
  }

  if (node.props.variant === "destructive") {
    return node;
  }

  return Children.toArray(node.props.children)
    .map(findLogoutItem)
    .find((item) => item !== undefined);
}

describe("NavUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPending = false;
    mocks.mutationOptions = undefined;
    mocks.mutate.mockImplementation(() =>
      mocks.mutationOptions?.mutationFn?.()
    );
  });

  it.each([
    "success",
    "failure",
  ])("clears the local session and navigates after logout %s", async (result) => {
    NavUser();

    await mocks.mutationOptions?.onSettled?.(
      undefined,
      result === "failure" ? new Error("Logout failed") : null
    );

    expect(mocks.clearSession).toHaveBeenCalledOnce();
    expect(mocks.clearQueryCache).toHaveBeenCalledOnce();
    expect(mocks.invalidate).toHaveBeenCalledOnce();
    expect(mocks.navigate).toHaveBeenCalledWith({
      replace: true,
      to: "/login",
    });
  });

  it("disables logout while the request is pending", () => {
    mocks.isPending = true;

    const logoutItem = findLogoutItem(NavUser());

    expect(logoutItem?.props.disabled).toBe(true);
  });

  it("calls the logout mutation when clicked", () => {
    const logoutItem = findLogoutItem(NavUser());

    logoutItem?.props.onClick?.();

    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.mutate).toHaveBeenCalledOnce();
  });
});
