"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2 } from "lucide-react";
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
import { PhotoUploader, type UploadedPhoto } from "@/components/photo-uploader";
import { addLocationPhotosAction } from "./actions";

export function AddPhotosDialog({ slug }: { slug: string }) {
  const t = useTranslations("LocationDetail");
  const tSubmit = useTranslations("Submit");
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [inspiration, setInspiration] = React.useState<UploadedPhoto[]>([]);
  const [technical, setTechnical] = React.useState<UploadedPhoto[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  const total = inspiration.length + technical.length;

  function reset() {
    setInspiration([]);
    setTechnical([]);
  }

  async function submit() {
    if (total === 0) {
      toast({
        title: t("addPhotosNeedAtLeastOne"),
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const photos = [
        ...inspiration.map((p) => ({
          cloudinaryPublicId: p.cloudinaryPublicId,
          width: p.width ?? null,
          height: p.height ?? null,
          kind: "INSPIRATION" as const,
          caption: null,
        })),
        ...technical.map((p) => ({
          cloudinaryPublicId: p.cloudinaryPublicId,
          width: p.width ?? null,
          height: p.height ?? null,
          kind: "TECHNICAL" as const,
          caption: null,
        })),
      ];
      const res = await addLocationPhotosAction(slug, { photos });
      if (res.ok) {
        toast({
          title: t("addPhotosSuccessTitle"),
          description: t("addPhotosSuccessBody"),
        });
        reset();
        setOpen(false);
      } else {
        toast({
          title: t("addPhotosFailedTitle"),
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: t("addPhotosFailedTitle"),
        description: e?.message ?? "",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImagePlus className="me-2 h-4 w-4" />
          {t("addPhotos")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("addPhotosTitle")}</DialogTitle>
          <DialogDescription>{t("addPhotosHelper")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <PhotoUploader
            label={tSubmit("inspirationLabel")}
            helperText={tSubmit("inspirationHelper")}
            value={inspiration}
            onChange={setInspiration}
          />
          <PhotoUploader
            label={tSubmit("technicalLabel")}
            helperText={tSubmit("technicalHelper")}
            value={technical}
            onChange={setTechnical}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            {t("addPhotosCancel")}
          </Button>
          <Button onClick={submit} disabled={submitting || total === 0}>
            {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("addPhotosSubmit", { count: total })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
