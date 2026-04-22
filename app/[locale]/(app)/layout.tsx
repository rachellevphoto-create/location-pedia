import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/site-nav";
import { PersistentMapProvider } from "@/components/persistent-map/provider";
import { PersistentMapHost } from "@/components/persistent-map/host";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <PersistentMapProvider>
      <div className="flex min-h-screen flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
      </div>
      <PersistentMapHost />
    </PersistentMapProvider>
  );
}
