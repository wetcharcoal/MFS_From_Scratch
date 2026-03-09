import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type ToastType = "default" | "success" | "error";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "default") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 15000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center w-fit max-w-[min(84rem,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "w-fit max-w-full px-4 py-3 rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-2",
              t.type === "error" && "bg-destructive text-destructive-foreground",
              t.type === "success" && "bg-green-600 text-white",
              t.type === "default" && "bg-muted text-foreground"
            )}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <span className="whitespace-pre-wrap break-words">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 mt-0.5 opacity-70 hover:opacity-100"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
