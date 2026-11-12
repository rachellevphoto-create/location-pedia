"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const COOKIE_NAME = "lp_consent";
const ONE_YEAR = 60 * 60 * 24 * 365;

function readConsent(): "accepted" | "declined" | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === COOKIE_NAME) {
      if (v === "accepted" || v === "declined") return v;
    }
  }
  return null;
}

function writeConsent(value: "accepted" | "declined") {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
  try {
    window.dispatchEvent(
      new CustomEvent("lp:consent-change", { detail: { value } }),
    );
  } catch {
  }
}

export function CookieConsent() {
  const t = useTranslations("Cookies");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (readConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function decide(value: "accepted" | "declined") {
    writeConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:px-6 sm:pb-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">{t("title")}</p>
          <p className="text-muted-foreground">{t("body")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => decide("declined")}>
            {t("decline")}
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
