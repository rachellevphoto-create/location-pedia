import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          PhotoLoc
        </Link>
        <nav className="text-sm text-muted-foreground">
          <Link href="/discover" className="hover:text-foreground">
            Discover
          </Link>
        </nav>
      </header>
      <main className="container flex justify-center pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
