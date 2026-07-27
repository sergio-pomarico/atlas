import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  hasHydrated: boolean;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
  setHasHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      hasHydrated: false,
      setAccessToken: (accessToken) => set({ accessToken }),
      clearSession: () => set({ accessToken: null }),
      setHasHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "atlas-auth",
      partialize: ({ accessToken }) => ({ accessToken }),
      onRehydrateStorage: (state) => () => state.setHasHydrated(),
    }
  )
);
