import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Landing");
  const tCommon = await getTranslations("Common");
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {tCommon("appName")}
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/discover"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("navDiscover")}
          </Link>
          {session?.user ? (
            <Button asChild size="sm">
              <Link href="/discover">{t("openApp")}</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{tCommon("signIn")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{tCommon("join")}</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="container py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold tracking-tight md:text-6xl">
          {t("heroTitle")}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t("heroSubtitle")}
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/discover">{t("ctaExplore")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">{t("ctaJoin")}</Link>
          </Button>
        </div>
      </section>

      <section className="container grid gap-6 pb-24 md:grid-cols-3">
        <Feature title={t("feature1Title")} body={t("feature1Body")} />
        <Feature title={t("feature2Title")} body={t("feature2Body")} />
        <Feature title={t("feature3Title")} body={t("feature3Body")} />
      </section>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
