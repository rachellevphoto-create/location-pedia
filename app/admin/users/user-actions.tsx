"use client";

import * as React from "react";
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

  function decide(d: "APPROVE" | "REJECT" | "BAN") {
    start(async () => {
      const res = await decideUserAction(userId, d);
      if (res.ok) {
        toast({ title: `User ${d.toLowerCase()}d.` });
      } else {
        toast({ title: "Failed", description: res.error, variant: "destructive" });
      }
    });
  }

  return (
    <div className="inline-flex gap-2">
      {status !== "APPROVED" && (
        <Button size="sm" disabled={pending} onClick={() => decide("APPROVE")}>
          {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Approve
        </Button>
      )}
      {status !== "REJECTED" && status !== "BANNED" && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => decide("REJECT")}
        >
          Reject
        </Button>
      )}
      {status !== "BANNED" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => decide("BAN")}
        >
          Ban
        </Button>
      )}
    </div>
  );
}
