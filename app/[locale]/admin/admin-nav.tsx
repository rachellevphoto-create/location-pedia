"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type AdminNavLink = { href: string; label: string; count?: number };

export function AdminNav({ links }: { links: AdminNavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto text-sm md:flex-col md:overflow-visible">
      {links.map((l) => {
        const active =
          l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href as any}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center justify-between gap-3 rounded-lg border px-3 transition-colors",
              active
                ? "border-border bg-card font-semibold text-foreground shadow-sm"
                : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground",
            )}
          >
            {l.label}
            {!!l.count && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-border text-foreground",
                )}
              >
                {l.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
