"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Errors");
  return (
    <div className="container flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <h2 className="text-xl font-semibold">{t("somethingWrong")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || t("unexpectedError")}
      </p>
      <Button onClick={reset} className="mt-4">
        {t("tryAgain")}
      </Button>
    </div>
  );
}
