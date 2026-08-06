import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useUIStore } from "@/stores/ui-store";

export function ErrorToast() {
  const errorMessage = useUIStore((state) => state.errorMessage);
  const clearError = useUIStore((state) => state.clearError);

  useEffect(() => {
    if (!errorMessage) {
      return;
    }
    toast.error(errorMessage, {
      id: "global-error",
      icon: <AlertTriangle className="h-4 w-4" />,
      richColors: true,
      position: "bottom-center",
      onAutoClose: clearError,
      onDismiss: clearError,
    });
  }, [clearError, errorMessage]);

  return null;
}
