"use client";

import * as React from "react";
import imageCompression from "browser-image-compression";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const MAX_BYTES = 1024 * 1024;

export type UploadedPhoto = {
  cloudinaryPublicId: string;
  width?: number;
  height?: number;
  previewUrl: string;
};

export function PhotoUploader({
  value,
  onChange,
  label,
  helperText,
}: {
  value: UploadedPhoto[];
  onChange: (next: UploadedPhoto[]) => void;
  label?: string;
  helperText?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();
  const t = useTranslations("PhotoUploader");
  const labelText = label ?? t("addPhotos");

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const sigRes = await fetch("/api/upload/sign", { method: "POST" });
      if (!sigRes.ok) {
        const data = await sigRes.json().catch(() => ({}));
        throw new Error(data.error || t("uploadFailedDescription"));
      }
      const sig = await sigRes.json();

      const newPhotos: UploadedPhoto[] = [];
      for (const file of Array.from(files)) {
        const compressed = await imageCompression(file, {
          maxSizeMB: MAX_BYTES / (1024 * 1024),
          maxWidthOrHeight: 2400,
          useWebWorker: true,
        });

        const fd = new FormData();
        fd.append("file", compressed);
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", String(sig.timestamp));
        fd.append("folder", sig.folder);
        if (sig.tags) fd.append("tags", sig.tags);
        fd.append("signature", sig.signature);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
          { method: "POST", body: fd },
        );
        if (!res.ok) throw new Error(t("uploadFailedDescription"));
        const data = await res.json();
        newPhotos.push({
          cloudinaryPublicId: data.public_id,
          width: data.width,
          height: data.height,
          previewUrl: data.secure_url,
        });
      }
      onChange([...value, ...newPhotos]);
    } catch (e: any) {
      toast({
        title: t("uploadFailed"),
        description: e?.message ?? t("uploadFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{labelText}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="me-2 h-4 w-4" />
          )}
          {busy ? t("uploading") : t("chooseFiles")}
        </Button>
      </div>
      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((p, idx) => (
            <li
              key={p.cloudinaryPublicId}
              className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
            >
              <img
                src={p.previewUrl}
                alt={t("uploadedPhotoAlt")}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                aria-label={t("removePhoto")}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
