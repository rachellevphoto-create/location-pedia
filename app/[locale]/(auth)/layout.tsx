import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {tCommon("appName")}
        </Link>
        <nav className="text-sm text-muted-foreground">
          <Link href="/discover" className="hover:text-foreground">
            {tLanding("navDiscover")}
          </Link>
        </nav>
      </header>
      <main className="container flex justify-center pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
