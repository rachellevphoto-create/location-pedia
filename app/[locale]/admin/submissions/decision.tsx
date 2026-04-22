"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { decideLocationAction } from "../actions";
import type { LocationStatus } from "@prisma/client";

export function SubmissionDecision({
  locationId,
  status,
}: {
  locationId: string;
  status: LocationStatus;
}) {
  const [pending, start] = React.useTransition();
  const [reason, setReason] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const { toast } = useToast();
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const tLocStatus = useTranslations("Status.location");

  function decide(payload: any, label: string) {
    start(async () => {
      const res = await decideLocationAction(locationId, payload);
      if (res.ok) {
        toast({ title: label });
      } else {
        toast({
          title: t("decisionFailed"),
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  if (status !== "DRAFT" && status !== "PENDING" && status !== "NEEDS_REVISION") {
    return (
      <p className="text-xs text-muted-foreground">
        {t("colStatus")}: {tLocStatus(status)}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          decide({ decision: "APPROVE" }, t("approvedToast"))
        }
      >
        {pending && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
        {t("approveAndPoints")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          decide({ decision: "APPROVE_NO_POINTS" }, t("approvedNoPointsToast"))
        }
      >
        {t("approveNoPoints")}
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={pending}>
            {t("returnForRevision")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("requestRevisionTitle")}</DialogTitle>
            <DialogDescription>
              {t("requestRevisionDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder={t("revisionPlaceholder")}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={pending || feedback.trim().length < 3}
              onClick={() =>
                decide(
                  { decision: "REVISION", feedback: feedback.trim() },
                  t("revisionRequestedToast"),
                )
              }
            >
              {tCommon("send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={pending}>
            {tCommon("reject")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectSubmissionTitle")}</DialogTitle>
            <DialogDescription>
              {t("rejectSubmissionDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder={t("reasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                decide(
                  {
                    decision: "REJECT",
                    reason: reason.trim() || undefined,
                  },
                  t("rejectedToast"),
                )
              }
            >
              {tCommon("reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
