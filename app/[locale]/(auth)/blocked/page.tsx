import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function BlockedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("blockedTitle")}</CardTitle>
        <CardDescription>{t("blockedDescription")}</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
