import { create } from "zustand";

interface UIState {
  errorMessage: string | null;
  isLoading: boolean;
  loadingMessage?: string;
  clearError: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  showError: (message: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  errorMessage: null,
  isLoading: false,
  loadingMessage: undefined,
  clearError: () => set({ errorMessage: null }),
  setLoading: (isLoading, loadingMessage) =>
    set({
      isLoading,
      loadingMessage: isLoading ? loadingMessage : undefined,
    }),
  showError: (errorMessage) => set({ errorMessage }),
}));
