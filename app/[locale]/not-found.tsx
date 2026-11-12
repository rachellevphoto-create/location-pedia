import { useTranslations } from "next-intl";
import { MapPinOff } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("Errors");
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-16">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPinOff className="h-10 w-10" aria-hidden="true" />
        </div>
        <h1 className="bg-gradient-to-b from-slate-900 to-slate-500 bg-clip-text text-7xl font-bold tracking-tight text-transparent sm:text-8xl">
          {t("notFoundTitle")}
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          {t("notFoundBody")}
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/discover">{t("backToDiscover")}</Link>
        </Button>
      </div>
    </div>
  );
}
