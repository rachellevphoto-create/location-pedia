"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { decideUserAction } from "../actions";
import type { UserStatus } from "@prisma/client";

export function UserActions({
  userId,
  status,
}: {
  userId: string;
  status: UserStatus;
}) {
  const [pending, start] = React.useTransition();
  const { toast } = useToast();
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("Status.user");

  function decide(d: "APPROVE" | "REJECT" | "BAN") {
    start(async () => {
      const res = await decideUserAction(userId, d);
      if (res.ok) {
        const decisionLabel =
          d === "APPROVE"
            ? tStatus("APPROVED")
            : d === "REJECT"
              ? tStatus("REJECTED")
              : tStatus("BANNED");
        const description = res.emailDevOnly
          ? t("emailDevOnly")
          : res.emailSent
            ? t("emailSent")
            : t("emailFailed", { error: res.emailError ?? "" });
        toast({
          title: t("userDecided", { decision: decisionLabel }),
          description,
          variant: res.emailSent === false ? "destructive" : "default",
        });
      } else {
        toast({
          title: t("decisionFailed"),
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="inline-flex gap-2">
      {status !== "APPROVED" && (
        <Button size="sm" disabled={pending} onClick={() => decide("APPROVE")}>
          {pending && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
          {tCommon("approve")}
        </Button>
      )}
      {status !== "REJECTED" && status !== "BANNED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => decide("REJECT")}
        >
          {tCommon("reject")}
        </Button>
      )}
      {status !== "BANNED" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => decide("BAN")}
        >
          {tCommon("ban")}
        </Button>
      )}
    </div>
  );
}
