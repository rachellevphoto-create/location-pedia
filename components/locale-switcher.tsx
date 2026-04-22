"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { setUserLocaleAction } from "@/app/actions/locale";

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function switchTo(next: "he" | "en") {
    if (next === locale || pending) return;
    // Best-effort client-side cookie write so the next request already prefers it.
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(async () => {
      await setUserLocaleAction(next);
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="inline-flex items-center gap-0 rounded-md border bg-background p-0.5 text-xs">
      <Button
        type="button"
        size="sm"
        variant={locale === "he" ? "default" : "ghost"}
        onClick={() => switchTo("he")}
        disabled={pending}
        className="h-7 px-2"
      >
        HE
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "default" : "ghost"}
        onClick={() => switchTo("en")}
        disabled={pending}
        className="h-7 px-2"
      >
        EN
      </Button>
    </div>
  );
}
