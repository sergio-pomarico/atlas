import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  isVisible,
  message = "Loading...",
  className,
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <svg
          aria-label="Cargando"
          className="h-8 w-8 animate-spin text-primary"
          fill="none"
          role="img"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 0 1 8-8"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
        {message && (
          <p className="font-medium text-gray-700 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
