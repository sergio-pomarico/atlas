import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      closeButton
      duration={5000}
      position="bottom-right"
      theme="light"
      toastOptions={{
        classNames: {
          error:
            "border-destructive/30 bg-destructive text-destructive-foreground",
          toast: "border-border bg-popover text-popover-foreground shadow-lg",
        },
      }}
      {...props}
    />
  );
}
