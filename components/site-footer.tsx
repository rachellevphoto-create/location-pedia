import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";

/** Thin signature line at the bottom of every page. Height: h-10 (2.5rem). */
export async function SiteFooter() {
  const t = await getTranslations("Footer");
  return (
    <footer className="h-10 shrink-0 border-t bg-background">
      <div className="container flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
        <BrandMark className="brand-logo h-3.5" />
        <span>{t("credit")}</span>
      </div>
    </footer>
  );
}
