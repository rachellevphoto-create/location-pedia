"use client";

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type State = { toasts: ToasterToast[] };

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(next: State) {
  memoryState = next;
  listeners.forEach((l) => l(memoryState));
}

type Toast = Omit<ToasterToast, "id">;

function toast(props: Toast) {
  const id = genId();
  const update = (next: ToasterToast) =>
    dispatch({
      toasts: memoryState.toasts.map((t) =>
        t.id === id ? { ...t, ...next } : t,
      ),
    });
  const dismiss = () =>
    dispatch({ toasts: memoryState.toasts.filter((t) => t.id !== id) });

  dispatch({
    toasts: [
      {
        ...props,
        id,
        open: true,
        onOpenChange: (open: boolean) => {
          if (!open) dismiss();
        },
      },
      ...memoryState.toasts,
    ].slice(0, TOAST_LIMIT),
  });

  setTimeout(dismiss, TOAST_REMOVE_DELAY);
  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({
        toasts: toastId
          ? memoryState.toasts.filter((t) => t.id !== toastId)
          : [],
      }),
  };
}

export { useToast, toast };
