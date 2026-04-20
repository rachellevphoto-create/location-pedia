import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          PhotoLoc
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/discover"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Discover
          </Link>
          {session?.user ? (
            <Button asChild size="sm">
              <Link href="/discover">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Join</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="container py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold tracking-tight md:text-6xl">
          The Waze and Wolt of photography locations.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Discover, filter, and navigate to vetted photography locations.
          Real-time updates, accessibility info, and a community-curated map of
          spots that are actually worth your time.
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/discover">Explore the map</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Become a contributor</Link>
          </Button>
        </div>
      </section>

      <section className="container grid gap-6 pb-24 md:grid-cols-3">
        <Feature
          title="Dual-view discovery"
          body="Toggle between an interactive map and rich list cards with rating, distance, and accessibility at a glance."
        />
        <Feature
          title="Real-time field updates"
          body="See bloom timing, construction warnings, and access changes posted by photographers on the ground."
        />
        <Feature
          title="Earn points, unlock secrets"
          body="Contribute approved locations, photos, and updates to earn points. Spend them to reveal exclusive secret spots."
        />
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
