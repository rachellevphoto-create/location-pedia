"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, SquarePen, Trash2 } from "lucide-react";
import type { LocationStatus } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
import {
  deleteLocationAction,
  setLocationHiddenAction,
} from "../actions";

export function LocationRowActions({
  locationId,
  slug,
  status,
  hidden,
}: {
  locationId: string;
  slug: string;
  status: LocationStatus;
  hidden: boolean;
}) {
  const [pending, start] = React.useTransition();
  const [hideOpen, setHideOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { toast } = useToast();
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");

  function toggleHidden() {
    start(async () => {
      const res = await setLocationHiddenAction(locationId, !hidden);
      if (res.ok) {
        toast({
          title: hidden ? t("locationUnhidden") : t("locationHidden"),
        });
        setHideOpen(false);
      } else {
        toast({
          title: t("locationActionFailed"),
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteLocationAction(locationId);
      if (res.ok) {
        toast({ title: t("locationDeleted") });
        setDeleteOpen(false);
      } else {
        toast({
          title: t("locationActionFailed"),
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  const canView = status === "PUBLISHED" && !hidden;

  return (
    <div className="inline-flex items-center gap-1">
      {canView && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          title={t("actionView")}
          aria-label={t("actionView")}
        >
          <Link href={`/locations/${slug}`}>
            <Eye className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      )}

      <Button
        asChild
        variant="ghost"
        size="icon"
        title={t("actionEdit")}
        aria-label={t("actionEdit")}
      >
        <Link href={`/admin/locations/${locationId}/edit` as never}>
          <SquarePen className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>

      <Dialog open={hideOpen} onOpenChange={setHideOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            title={hidden ? t("actionUnhide") : t("actionHide")}
            aria-label={hidden ? t("actionUnhide") : t("actionHide")}
          >
            {hidden ? (
              <Eye className="h-4 w-4" aria-hidden="true" />
            ) : (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {hidden ? t("unhideLocationTitle") : t("hideLocationTitle")}
            </DialogTitle>
            <DialogDescription>
              {hidden
                ? t("unhideLocationDescription")
                : t("hideLocationDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setHideOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={toggleHidden}
            >
              {pending && (
                <Loader2 className="me-1 h-3 w-3 animate-spin" aria-hidden="true" />
              )}
              {hidden ? t("confirmUnhide") : t("confirmHide")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            title={t("actionDelete")}
            aria-label={t("actionDelete")}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteLocationTitle")}</DialogTitle>
            <DialogDescription>
              {t("deleteLocationDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setDeleteOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={remove}
            >
              {pending && (
                <Loader2 className="me-1 h-3 w-3 animate-spin" aria-hidden="true" />
              )}
              {t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
