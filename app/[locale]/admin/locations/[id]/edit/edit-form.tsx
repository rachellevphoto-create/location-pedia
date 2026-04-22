"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { MapPicker } from "@/components/map-picker";
import {
  PhotoUploader,
  type UploadedPhoto,
} from "@/components/photo-uploader";
import { STYLE_TAGS } from "@/lib/validation";
import { updateLocationAction } from "@/app/[locale]/admin/actions";
import type { FilterEntry } from "@/lib/validation";

type ExistingPhoto = {
  id: string;
  cloudinaryPublicId: string;
  kind: "INSPIRATION" | "TECHNICAL";
  previewUrl: string;
  caption: string | null;
};

export type EditLocationInitial = {
  title: string;
  description: string;
  directions: string | null;
  latitude: number;
  longitude: number;
  wheelchair: boolean;
  publicTransport: boolean;
  restroom: boolean;
  changingRoom: boolean;
  drone: boolean;
  paid: boolean;
  priceMin: number | null;
  priceMax: number | null;
  styleTags: string[];
  isSecret: boolean;
  status: string;
  unlockCost: number;
  reviewFeedback: string | null;
  existingPhotos: ExistingPhoto[];
};

const STATUS_OPTIONS = [
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "NEEDS_REVISION",
] as const;

function buildFilters(opts: {
  wheelchair: boolean;
  publicTransport: boolean;
  restroom: boolean;
  changingRoom: boolean;
  drone: boolean;
  paid: boolean;
  priceMin: string;
  priceMax: string;
  isSecret: boolean;
  styleTags: string[];
}): FilterEntry[] {
  const entries: FilterEntry[] = [];
  if (opts.wheelchair) entries.push({ slug: "wheelchair", boolValue: true });
  if (opts.publicTransport) entries.push({ slug: "publicTransport", boolValue: true });
  if (opts.restroom) entries.push({ slug: "restroom", boolValue: true });
  if (opts.changingRoom) entries.push({ slug: "changingRoom", boolValue: true });
  if (opts.drone) entries.push({ slug: "drone", boolValue: true });
  if (opts.paid) entries.push({ slug: "paid", boolValue: true });
  if (opts.priceMin) entries.push({ slug: "priceMin", boolValue: true, numValue: Number(opts.priceMin) });
  if (opts.priceMax) entries.push({ slug: "priceMax", boolValue: true, numValue: Number(opts.priceMax) });
  if (opts.isSecret) entries.push({ slug: "isSecret", boolValue: true });
  for (const tag of opts.styleTags) {
    entries.push({ slug: tag, boolValue: true });
  }
  return entries;
}

export function EditLocationForm({
  id,
  initial,
}: {
  id: string;
  initial: EditLocationInitial;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations("Submit");
  const tAdmin = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const tTags = useTranslations("Tags");
  const tStatus = useTranslations("Status.location");

  const [title, setTitle] = React.useState(initial.title);
  const [description, setDescription] = React.useState(initial.description);
  const [directions, setDirections] = React.useState(initial.directions ?? "");
  const [coords, setCoords] = React.useState({
    lat: initial.latitude,
    lng: initial.longitude,
  });
  const [wheelchair, setWheelchair] = React.useState(initial.wheelchair);
  const [publicTransport, setPublicTransport] = React.useState(initial.publicTransport);
  const [restroom, setRestroom] = React.useState(initial.restroom);
  const [changingRoom, setChangingRoom] = React.useState(initial.changingRoom);
  const [drone, setDrone] = React.useState(initial.drone);
  const [paid, setPaid] = React.useState(initial.paid);
  const [priceMin, setPriceMin] = React.useState(initial.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = React.useState(initial.priceMax?.toString() ?? "");
  const [styleTags, setStyleTags] = React.useState<string[]>(initial.styleTags);
  const [isSecret, setIsSecret] = React.useState(initial.isSecret);
  const [status, setStatus] = React.useState<string>(initial.status);
  const [unlockCost, setUnlockCost] = React.useState(initial.unlockCost.toString());
  const [reviewFeedback, setReviewFeedback] = React.useState(initial.reviewFeedback ?? "");

  const [keepIds, setKeepIds] = React.useState<Set<string>>(
    new Set(initial.existingPhotos.map((p) => p.id)),
  );
  const [newInspiration, setNewInspiration] = React.useState<UploadedPhoto[]>([]);
  const [newTechnical, setNewTechnical] = React.useState<UploadedPhoto[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  function toggleTag(tag: string) {
    setStyleTags((tags) =>
      tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    );
  }

  function toggleKeep(photoId: string) {
    setKeepIds((s) => {
      const next = new Set(s);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  async function onSubmit() {
    setSubmitting(true);
    try {
      const newPhotos = [
        ...newInspiration.map((p) => ({
          cloudinaryPublicId: p.cloudinaryPublicId,
          width: p.width ?? null,
          height: p.height ?? null,
          kind: "INSPIRATION" as const,
          caption: null,
        })),
        ...newTechnical.map((p) => ({
          cloudinaryPublicId: p.cloudinaryPublicId,
          width: p.width ?? null,
          height: p.height ?? null,
          kind: "TECHNICAL" as const,
          caption: null,
        })),
      ];
      const res = await updateLocationAction(id, {
        title: title.trim(),
        description: description.trim(),
        directions: directions.trim() || undefined,
        latitude: coords.lat,
        longitude: coords.lng,
        filters: buildFilters({
          wheelchair, publicTransport, restroom, changingRoom, drone,
          paid, priceMin, priceMax, isSecret, styleTags,
        }),
        status: status as "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED" | "NEEDS_REVISION",
        unlockCost: Number(unlockCost) || 0,
        reviewFeedback: reviewFeedback.trim() || null,
        keepPhotoIds: Array.from(keepIds),
        newPhotos,
      });
      if (res.ok) {
        toast({ title: tAdmin("locationUpdated") });
        router.push(`/admin/locations` as never);
        router.refresh();
      } else {
        toast({
          title: tAdmin("locationUpdateFailed"),
          description: res.error,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: tAdmin("locationUpdateFailed"),
        description: (e as Error)?.message ?? "Error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("stepBasics")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">{t("fieldTitle")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">{t("fieldDescription")}</Label>
            <Textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stepLocation")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MapPicker value={coords} onChange={setCoords} />
          <div className="space-y-1.5">
            <Label htmlFor="directions">{t("fieldDirections")}</Label>
            <Textarea
              id="directions"
              rows={4}
              value={directions}
              onChange={(e) => setDirections(e.target.value)}
              placeholder={t("directionsPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">
              {t("directionsHelper")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stepDetails")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("styleTags")}</legend>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="focus:outline-none"
                >
                  <Badge
                    variant={styleTags.includes(tag) ? "default" : "outline"}
                  >
                    {tTags(tag as never)}
                  </Badge>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Toggle label={t("wheelchair")} checked={wheelchair} onChange={setWheelchair} />
            <Toggle label={t("publicTransport")} checked={publicTransport} onChange={setPublicTransport} />
            <Toggle label={t("restroom")} checked={restroom} onChange={setRestroom} />
            <Toggle label={t("changingRoom")} checked={changingRoom} onChange={setChangingRoom} />
            <Toggle label={t("drone")} checked={drone} onChange={setDrone} />
            <Toggle label={t("paidEntry")} checked={paid} onChange={setPaid} />
            <Toggle label={t("secretSpot")} checked={isSecret} onChange={setIsSecret} />
          </fieldset>

          {paid && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="priceMin">{t("priceMin")}</Label>
                <Input
                  id="priceMin"
                  type="number"
                  min={0}
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priceMax">{t("priceMax")}</Label>
                <Input
                  id="priceMax"
                  type="number"
                  min={0}
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>
          )}

          {isSecret && (
            <div className="space-y-1.5">
              <Label htmlFor="unlockCost">{tAdmin("unlockCost")}</Label>
              <Input
                id="unlockCost"
                type="number"
                min={0}
                value={unlockCost}
                onChange={(e) => setUnlockCost(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("stepPhotos")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {initial.existingPhotos.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">{tAdmin("existingPhotos")}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {initial.existingPhotos.map((p) => {
                  const kept = keepIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`relative overflow-hidden rounded-md border ${kept ? "" : "opacity-40"}`}
                    >
                      <img src={p.previewUrl} alt="" className="h-32 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => toggleKeep(p.id)}
                        className="absolute end-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                        aria-label={kept ? tAdmin("removePhoto") : tAdmin("restorePhoto")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute start-1 top-1">
                        <Badge variant="secondary">{p.kind}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">{tAdmin("photoDeleteHint")}</p>
            </div>
          ) : null}

          <PhotoUploader
            label={t("inspirationLabel")}
            helperText={t("inspirationHelper")}
            value={newInspiration}
            onChange={setNewInspiration}
          />
          <PhotoUploader
            label={t("technicalLabel")}
            helperText={t("technicalHelper")}
            value={newTechnical}
            onChange={setNewTechnical}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tAdmin("statusAndReview")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="status">{tAdmin("status")}</Label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s as never)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="feedback">{tAdmin("reviewFeedback")}</Label>
            <Textarea
              id="feedback"
              rows={3}
              value={reviewFeedback}
              onChange={(e) => setReviewFeedback(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={onSubmit} disabled={submitting}>
          {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
