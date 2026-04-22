"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type MultiSelectOption = {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  ariaLabel?: string;
};

export interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  clearLabel?: string;
  emptyLabel?: string;
  align?: "start" | "end";
  className?: string;
}

export function MultiSelect({
  label,
  options,
  selected,
  onChange,
  clearLabel = "Clear",
  emptyLabel = "No options",
  align = "start",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange([]);
  }

  const count = selected.length;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant={count > 0 ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5 font-normal"
      >
        <span>{label}</span>
        {count > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/30 px-1 text-[10px] font-semibold">
            {count}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1 max-h-72 w-56 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            align === "end" ? "end-0" : "start-0",
          )}
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {options.map((opt) => {
                const isSel = selected.includes(opt.value);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-accent hover:text-accent-foreground",
                        isSel && "bg-accent/40",
                      )}
                      role="option"
                      aria-selected={isSel}
                      aria-label={opt.ariaLabel}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSel
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input",
                        )}
                      >
                        {isSel && <Check className="h-3 w-3" />}
                      </span>
                      {opt.icon}
                      <span className="flex-1 truncate">{opt.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {count > 0 && (
            <button
              type="button"
              onClick={clear}
              className="mt-1 flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-3 w-3" />
              {clearLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
