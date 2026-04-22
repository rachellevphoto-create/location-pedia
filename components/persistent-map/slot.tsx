"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  usePersistentMapContext,
  type PersistentMapBbox,
  type PersistentMapInitial,
} from "./provider";
import type { DiscoverItem } from "@/lib/api-types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

export function MapSlot({
  items,
  initial,
  onMoveEnd,
}: {
  items: DiscoverItem[];
  initial?: PersistentMapInitial;
  onMoveEnd?: (bbox: PersistentMapBbox) => void;
}) {
  const ctx = usePersistentMapContext();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const t = useTranslations("Map");

  const propsRef = React.useRef({ items, initial, onMoveEnd });
  React.useEffect(() => {
    propsRef.current = { items, initial, onMoveEnd };
  }, [items, initial, onMoveEnd]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !TOKEN) return;
    const unregister = ctx.registerSlot(el, propsRef.current);
    return unregister;
  }, [ctx]);

  React.useEffect(() => {
    if (!TOKEN) return;
    ctx.updateSlotProps({ items, initial, onMoveEnd });
  }, [ctx, items, initial, onMoveEnd]);

  if (!TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        {t("tokenMissingHelp")}
      </div>
    );
  }

  return <div ref={ref} className="h-full w-full" aria-hidden />;
}
