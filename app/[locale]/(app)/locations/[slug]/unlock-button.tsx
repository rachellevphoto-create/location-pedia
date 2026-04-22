"use client";

import * as React from "react";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { unlockSecretAction } from "./actions";

export function UnlockButton({
  slug,
  cost,
  userPoints,
  loggedIn,
}: {
  slug: string;
  cost: number;
  userPoints: number;
  loggedIn: boolean;
}) {
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  if (!loggedIn) {
    return (
      <div className="rounded-xl border bg-amber-50 p-4 text-sm">
        <p className="font-semibold text-amber-900">Premium location</p>
        <p className="mt-1 text-amber-900/80">
          Sign in and earn points to unlock exact details.
        </p>
        <Button asChild className="mt-3 w-full">
          <Link href={`/login?next=/locations/${slug}`}>Sign in</Link>
        </Button>
      </div>
    );
  }

  const canAfford = userPoints >= cost;

  function unlock() {
    start(async () => {
      const res = await unlockSecretAction(slug);
      if (res.ok) {
        toast({ title: "Unlocked", description: "Coordinates revealed." });
      } else {
        toast({
          title: "Could not unlock",
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="rounded-xl border bg-amber-50 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-amber-900">
        <Lock className="h-4 w-4" /> Premium location
      </p>
      <p className="mt-1 text-amber-900/80">
        Costs {cost} points. You have {userPoints}.
      </p>
      <Button
        onClick={unlock}
        disabled={!canAfford || pending}
        className="mt-3 w-full bg-amber-600 hover:bg-amber-600/90"
      >
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {canAfford ? `Unlock for ${cost} points` : "Not enough points"}
      </Button>
    </div>
  );
}
