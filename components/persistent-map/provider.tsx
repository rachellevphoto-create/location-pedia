"use client";

import * as React from "react";
import type { DiscoverItem } from "@/lib/api-types";

export type PersistentMapBbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type PersistentMapInitial = { lat: number; lng: number; zoom?: number };

export type PersistentMapSlotProps = {
  items: DiscoverItem[];
  initial?: PersistentMapInitial;
  onMoveEnd?: (bbox: PersistentMapBbox) => void;
};

type Rect = { top: number; left: number; width: number; height: number };

type ResizeFn = () => void;

type PersistentMapContextValue = {
  registerSlot: (
    el: HTMLElement,
    props: PersistentMapSlotProps,
  ) => () => void;
  updateSlotProps: (props: PersistentMapSlotProps) => void;
  registerHostResize: (fn: ResizeFn | null) => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => PersistentMapState;
  getServerSnapshot: () => PersistentMapState;
};

export type PersistentMapState = {
  active: boolean;
  rect: Rect | null;
  items: DiscoverItem[];
  initial?: PersistentMapInitial;
  onMoveEnd?: (bbox: PersistentMapBbox) => void;
};

const initialState: PersistentMapState = {
  active: false,
  rect: null,
  items: [],
  initial: undefined,
  onMoveEnd: undefined,
};

const PersistentMapContext =
  React.createContext<PersistentMapContextValue | null>(null);

export function usePersistentMapContext() {
  const ctx = React.useContext(PersistentMapContext);
  if (!ctx) {
    throw new Error(
      "usePersistentMapContext must be used inside <PersistentMapProvider>",
    );
  }
  return ctx;
}

export function usePersistentMapState(): PersistentMapState {
  const { subscribe, getSnapshot, getServerSnapshot } =
    usePersistentMapContext();
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function PersistentMapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const stateRef = React.useRef<PersistentMapState>(initialState);
  const listenersRef = React.useRef<Set<() => void>>(new Set());
  const slotElRef = React.useRef<HTMLElement | null>(null);
  const observerRef = React.useRef<ResizeObserver | null>(null);
  const hostResizeRef = React.useRef<ResizeFn | null>(null);
  const rafRef = React.useRef<number | null>(null);

  const emit = React.useCallback(() => {
    listenersRef.current.forEach((l) => l());
  }, []);

  const setState = React.useCallback(
    (next: Partial<PersistentMapState>) => {
      stateRef.current = { ...stateRef.current, ...next };
      emit();
    },
    [emit],
  );

  const measureAndUpdate = React.useCallback(() => {
    const el = slotElRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const next: Rect = {
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
    };
    const prev = stateRef.current.rect;
    if (
      !prev ||
      prev.top !== next.top ||
      prev.left !== next.left ||
      prev.width !== next.width ||
      prev.height !== next.height
    ) {
      setState({ rect: next });
      // Defer resize to after the host applies the new style so mapbox sees the
      // updated container dimensions.
      if (hostResizeRef.current) {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          hostResizeRef.current?.();
        });
      }
    }
  }, [setState]);

  const startObserving = React.useCallback(
    (el: HTMLElement) => {
      slotElRef.current = el;
      if (typeof ResizeObserver !== "undefined") {
        observerRef.current?.disconnect();
        observerRef.current = new ResizeObserver(() => measureAndUpdate());
        observerRef.current.observe(el);
      }
      window.addEventListener("scroll", measureAndUpdate, true);
      window.addEventListener("resize", measureAndUpdate);
      measureAndUpdate();
    },
    [measureAndUpdate],
  );

  const stopObserving = React.useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    window.removeEventListener("scroll", measureAndUpdate, true);
    window.removeEventListener("resize", measureAndUpdate);
    slotElRef.current = null;
  }, [measureAndUpdate]);

  const registerSlot = React.useCallback(
    (el: HTMLElement, props: PersistentMapSlotProps) => {
      if (slotElRef.current && slotElRef.current !== el) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[PersistentMap] another slot mounted while one was active; switching to the newest one",
          );
        }
        stopObserving();
      }
      setState({
        active: true,
        items: props.items,
        initial: props.initial ?? stateRef.current.initial,
        onMoveEnd: props.onMoveEnd,
      });
      startObserving(el);
      return () => {
        if (slotElRef.current !== el) return;
        stopObserving();
        // Keep last items in state so the host can stay populated while
        // navigating; just mark inactive and clear the live callback.
        setState({ active: false, onMoveEnd: undefined, rect: null });
      };
    },
    [setState, startObserving, stopObserving],
  );

  const updateSlotProps = React.useCallback(
    (props: PersistentMapSlotProps) => {
      const cur = stateRef.current;
      const next: Partial<PersistentMapState> = {};
      if (cur.items !== props.items) next.items = props.items;
      if (cur.onMoveEnd !== props.onMoveEnd) next.onMoveEnd = props.onMoveEnd;
      // initial is only honored on first mount; ignore later changes so the
      // viewport persists naturally.
      if (Object.keys(next).length > 0) setState(next);
    },
    [setState],
  );

  const registerHostResize = React.useCallback((fn: ResizeFn | null) => {
    hostResizeRef.current = fn;
  }, []);

  const subscribe = React.useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const getSnapshot = React.useCallback(() => stateRef.current, []);
  const getServerSnapshot = React.useCallback(() => initialState, []);

  React.useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      observerRef.current?.disconnect();
      window.removeEventListener("scroll", measureAndUpdate, true);
      window.removeEventListener("resize", measureAndUpdate);
    };
  }, [measureAndUpdate]);

  const value = React.useMemo<PersistentMapContextValue>(
    () => ({
      registerSlot,
      updateSlotProps,
      registerHostResize,
      subscribe,
      getSnapshot,
      getServerSnapshot,
    }),
    [
      registerSlot,
      updateSlotProps,
      registerHostResize,
      subscribe,
      getSnapshot,
      getServerSnapshot,
    ],
  );

  return (
    <PersistentMapContext.Provider value={value}>
      {children}
    </PersistentMapContext.Provider>
  );
}
