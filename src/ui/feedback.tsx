import { useEffect } from "react";
import { createPortal } from "react-dom";
import { create } from "zustand";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { cx } from "./cx";

// ------------------------------------------------------------------ toasts

interface Toast {
  id: number;
  text: string;
  tone: "info" | "success" | "danger";
}

interface ToastState {
  toasts: Toast[];
  push: (text: string, tone?: Toast["tone"]) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (text, tone = "info") => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-3), { id, text, tone }] });
    setTimeout(() => get().dismiss(id), 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = (text: string, tone?: Toast["tone"]) => useToasts.getState().push(text, tone);

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-16 z-[60] sm:bottom-4 sm:top-auto flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cx(
            "card animate-pop pointer-events-auto px-4 py-2.5 text-sm shadow-overlay",
            t.tone === "danger" && "border-danger/60 text-danger",
            t.tone === "success" && "border-success/60"
          )}
        >
          {t.text}
        </div>
      ))}
    </div>,
    document.body
  );
}

// ------------------------------------------------------------------ confirmations

interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

const useConfirmStore = create<{ request: ConfirmRequest | null }>()(() => ({ request: null }));

/** Promise-based replacement for `window.confirm`, styled with the theme. */
export function confirmDialog(options: Omit<ConfirmRequest, "resolve">): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ request: { ...options, resolve } }));
}

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const answer = (ok: boolean) => {
    request?.resolve(ok);
    useConfirmStore.setState({ request: null });
  };
  useEffect(() => () => useConfirmStore.getState().request?.resolve(false), []);
  if (!request) return null;
  return (
    <Modal
      open
      size="sm"
      title={request.title}
      onClose={() => answer(false)}
      footer={
        <>
          <Button onClick={() => answer(false)}>{request.cancelLabel}</Button>
          <Button variant={request.danger ? "danger" : "primary"} onClick={() => answer(true)} autoFocus>
            {request.confirmLabel}
          </Button>
        </>
      }
    >
      {request.message && <p className="text-sm text-text-secondary">{request.message}</p>}
    </Modal>
  );
}
