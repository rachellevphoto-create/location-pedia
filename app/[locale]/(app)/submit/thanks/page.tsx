import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ThanksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Submit");
  return (
    <div className="container max-w-xl py-16">
      <Card>
        <CardHeader>
          <CardTitle>{t("thanksTitle")}</CardTitle>
          <CardDescription>{t("thanksDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button asChild>
            <Link href="/discover">{t("thanksBackToDiscover")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/submit">{t("thanksSubmitAnother")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
