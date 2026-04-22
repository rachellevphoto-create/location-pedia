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
import { decidePhotoAction } from "../actions";

export function PhotoDecision({ photoId }: { photoId: string }) {
  const [pending, start] = React.useTransition();
  const [reason, setReason] = React.useState("");
  const { toast } = useToast();
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");

  function approve() {
    start(async () => {
      const res = await decidePhotoAction(photoId, { decision: "APPROVE" });
      if (res.ok) {
        toast({ title: t("photoApprovedToast") });
      } else {
        toast({
          title: t("decisionFailed"),
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  function reject(closeDialog: () => void) {
    start(async () => {
      const res = await decidePhotoAction(photoId, {
        decision: "REJECT",
        reviewNote: reason.trim() || undefined,
      });
      if (res.ok) {
        toast({ title: t("photoRejectedToast") });
        closeDialog();
      } else {
        toast({
          title: t("decisionFailed"),
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={approve} disabled={pending}>
        {pending && <Loader2 className="me-1 h-3 w-3 animate-spin" />}
        {t("approvePhoto")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={pending}>
            {t("rejectPhoto")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectPhotoTitle")}</DialogTitle>
            <DialogDescription>
              {t("rejectPhotoDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder={t("photoRejectReasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => reject(() => setOpen(false))}
            >
              {t("rejectPhoto")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
