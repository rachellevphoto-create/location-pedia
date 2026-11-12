"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Lock, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("Unlock");
  const tCommon = useTranslations("Common");
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  const canAfford = userPoints >= cost;

  function unlock() {
    start(async () => {
      const res = await unlockSecretAction(slug);
      if (res.ok) {
        toast({ title: t("unlockedToast"), description: t("unlockedDescription") });
      } else {
        toast({
          title: t("couldNotUnlock"),
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-2.5 rounded-2xl bg-foreground p-5 text-sm text-background">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-lime">
        <Lock className="h-3.5 w-3.5" /> {t("secretTitle")}
      </p>
      <p className="text-background/75">
        {loggedIn
          ? t("costHelp", { cost, points: userPoints })
          : t("loggedOutHelp")}
      </p>
      {loggedIn ? (
        <Button
          onClick={unlock}
          disabled={!canAfford || pending}
          className="h-11 w-full rounded-lg bg-lime font-bold text-lime-foreground hover:bg-lime/90"
        >
          {pending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {canAfford ? t("unlockFor", { cost }) : t("notEnoughPoints")}
        </Button>
      ) : (
        <Button
          asChild
          className="h-11 w-full rounded-lg bg-lime font-bold text-lime-foreground hover:bg-lime/90"
        >
          <Link href={`/login?next=/locations/${slug}` as any}>
            {tCommon("signIn")}
          </Link>
        </Button>
      )}
    </div>
  );
}
