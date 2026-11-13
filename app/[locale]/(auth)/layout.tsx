import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations("Common");
  const tLanding = await getTranslations("Landing");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="brand-logo flex items-center gap-2" dir="ltr">
          <BrandMark className="h-7" />
          <span className="font-display text-2xl font-bold uppercase leading-none tracking-wide">
            {tCommon("appName")}
          </span>
        </Link>
        <nav className="text-sm text-muted-foreground">
          <Link href="/discover" className="hover:text-foreground">
            {tLanding("navDiscover")}
          </Link>
        </nav>
      </header>
      <main className="container flex flex-1 justify-center pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
