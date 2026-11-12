"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Bus,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Loader2,
  Navigation,
  Shirt,
  ShowerHead,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { MapPicker } from "@/components/map-picker";
import { PhotoUploader, type UploadedPhoto } from "@/components/photo-uploader";
import { STYLE_TAGS } from "@/lib/validation";
import { submitLocationAction } from "./actions";
import type { FilterEntry } from "@/lib/validation";

type WizardData = {
  title: string;
  description: string;
  directions: string;
  coords: { lat: number; lng: number } | null;
  styleTags: string[];
  wheelchair: boolean;
  publicTransport: boolean;
  restroom: boolean;
  changingRoom: boolean;
  drone: boolean;
  paid: boolean;
  priceMin: string;
  priceMax: string;
  isSecret: boolean;
  inspirationPhotos: UploadedPhoto[];
  technicalPhotos: UploadedPhoto[];
};

const initial: WizardData = {
  title: "",
  description: "",
  directions: "",
  coords: null,
  styleTags: [],
  wheelchair: false,
  publicTransport: false,
  restroom: false,
  changingRoom: false,
  drone: false,
  paid: false,
  priceMin: "",
  priceMax: "",
  isSecret: false,
  inspirationPhotos: [],
  technicalPhotos: [],
};

const STEP_KEYS = ["stepBasics", "stepLocation", "stepDetails", "stepPhotos"] as const;
const STEP_DESC = ["descBasics", "descLocation", "descDetails", "descPhotos"] as const;
// Mirrors POINTS_VALUES in lib/points.ts (server-only module).
const SUBMIT_POINTS = 50;
const PHOTO_POINTS = 20;

function buildFilters(data: WizardData): FilterEntry[] {
  const entries: FilterEntry[] = [];
  if (data.wheelchair) entries.push({ slug: "wheelchair", boolValue: true });
  if (data.publicTransport) entries.push({ slug: "publicTransport", boolValue: true });
  if (data.restroom) entries.push({ slug: "restroom", boolValue: true });
  if (data.changingRoom) entries.push({ slug: "changingRoom", boolValue: true });
  if (data.drone) entries.push({ slug: "drone", boolValue: true });
  if (data.paid) entries.push({ slug: "paid", boolValue: true });
  if (data.priceMin) entries.push({ slug: "priceMin", boolValue: true, numValue: Number(data.priceMin) });
  if (data.priceMax) entries.push({ slug: "priceMax", boolValue: true, numValue: Number(data.priceMax) });
  if (data.isSecret) entries.push({ slug: "isSecret", boolValue: true });
  for (const tag of data.styleTags) {
    entries.push({ slug: tag, boolValue: true });
  }
  return entries;
}

export function SubmitWizard({ isAdmin = false }: { isAdmin?: boolean } = {}) {
  const router = useRouter();
  const t = useTranslations("Submit");
  const tv = useTranslations("Submit.validation");
  const tTags = useTranslations("Tags");
  const tCommon = useTranslations("Common");
  const [data, setData] = React.useState<WizardData>(initial);
  const [step, setStep] = React.useState<number>(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const { toast } = useToast();

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggleTag(tag: string) {
    update(
      "styleTags",
      data.styleTags.includes(tag)
        ? data.styleTags.filter((t) => t !== tag)
        : [...data.styleTags, tag],
    );
  }

  function validateStep(idx: number): string | null {
    if (idx === 0) {
      if (data.title.trim().length < 3) return tv("titleMin");
      if (data.description.trim().length < 20) return tv("descriptionMin");
    }
    if (idx === 1 && !data.coords) return tv("needPin");
    if (
      idx === 3 &&
      !isAdmin &&
      data.inspirationPhotos.length + data.technicalPhotos.length === 0
    )
      return tv("needPhoto");
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast({
        title: tv("holdOn"),
        description: err,
        variant: "destructive",
      });
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function translateValidation(code?: string): string | undefined {
    if (!code) return undefined;
    if (code.startsWith("v:")) {
      try {
        return tv(code.slice(2) as any);
      } catch {
        return code;
      }
    }
    return code;
  }

  async function submit() {
    const finalErr = validateStep(0) ?? validateStep(1) ?? validateStep(3);
    if (finalErr) {
      toast({
        title: tv("cannotSubmit"),
        description: finalErr,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const photos = [
        ...data.inspirationPhotos.map((p) => ({
          cloudinaryPublicId: p.cloudinaryPublicId,
          width: p.width ?? null,
          height: p.height ?? null,
          kind: "INSPIRATION" as const,
          caption: null,
        })),
        ...data.technicalPhotos.map((p) => ({
          cloudinaryPublicId: p.cloudinaryPublicId,
          width: p.width ?? null,
          height: p.height ?? null,
          kind: "TECHNICAL" as const,
          caption: null,
        })),
      ];
      const result = await submitLocationAction({
        title: data.title.trim(),
        description: data.description.trim(),
        directions: data.directions.trim() || undefined,
        latitude: data.coords!.lat,
        longitude: data.coords!.lng,
        filters: buildFilters(data),
        photos,
      });
      if (result && !result.ok) {
        const translated: Record<string, string> = {};
        for (const [k, v] of Object.entries(result.fieldErrors ?? {})) {
          translated[k] = translateValidation(v) ?? v;
        }
        setErrors(translated);
        toast({
          title: t("submissionFailed"),
          description: translateValidation(result.error) ?? result.error,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: t("submissionFailed"),
        description: e?.message ?? t("tryAgain"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      router.refresh();
    }
  }

  const previewCover =
    data.inspirationPhotos[0]?.previewUrl ??
    data.technicalPhotos[0]?.previewUrl ??
    null;
  const photoCount = data.inspirationPhotos.length + data.technicalPhotos.length;
  const maxPoints = SUBMIT_POINTS + PHOTO_POINTS * photoCount;

  return (
    <div className="space-y-7">
      <ol
        aria-label={t("stepsLabel")}
        className="grid grid-cols-4 gap-2.5"
      >
        {STEP_KEYS.map((key, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li
              key={key}
              aria-current={active ? "step" : undefined}
              className="space-y-2"
            >
              <div
                className={cn(
                  "h-1 rounded-full",
                  done || active ? "bg-primary" : "bg-border",
                )}
              />
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done
                      ? "bg-primary text-primary-foreground"
                      : active
                        ? "bg-foreground text-background"
                        : "bg-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden sm:inline",
                    active ? "font-semibold" : done ? "" : "text-muted-foreground",
                  )}
                >
                  {t(key)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-7 rounded-2xl border bg-card p-6 md:p-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">{t(STEP_KEYS[step])}</h2>
            <p className="text-sm text-muted-foreground">{t(STEP_DESC[step])}</p>
          </div>

          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">{t("fieldTitle")}</Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className="h-11 rounded-lg bg-background"
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t("fieldDescription")}</Label>
                <Textarea
                  id="description"
                  rows={6}
                  value={data.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  className="rounded-lg bg-background text-[15px]"
                />
                {errors.description && (
                  <p className="text-xs text-destructive">
                    {errors.description}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-xl border">
                <MapPicker
                  value={data.coords}
                  onChange={(c) => update("coords", c)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="directions">{t("fieldDirections")}</Label>
                <Textarea
                  id="directions"
                  rows={4}
                  value={data.directions}
                  onChange={(e) => update("directions", e.target.value)}
                  placeholder={t("directionsPlaceholder")}
                  className="rounded-lg bg-background text-[15px]"
                />
                <p className="text-xs text-muted-foreground">
                  {t("directionsHelper")}
                </p>
                {errors.directions && (
                  <p className="text-xs text-destructive">{errors.directions}</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-semibold">
                  {t("styleTags")}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAGS.map((tag) => {
                    const on = data.styleTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        aria-pressed={on}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "h-10 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          on
                            ? "border-foreground bg-foreground text-background"
                            : "bg-background hover:bg-muted",
                        )}
                      >
                        {tTags(tag)}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-sm font-semibold">
                  {t("amenitiesLegend")}
                </legend>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <Toggle
                    icon={<Users className="h-4 w-4" />}
                    label={t("wheelchair")}
                    checked={data.wheelchair}
                    onChange={(v) => update("wheelchair", v)}
                  />
                  <Toggle
                    icon={<Bus className="h-4 w-4" />}
                    label={t("publicTransport")}
                    checked={data.publicTransport}
                    onChange={(v) => update("publicTransport", v)}
                  />
                  <Toggle
                    icon={<ShowerHead className="h-4 w-4" />}
                    label={t("restroom")}
                    checked={data.restroom}
                    onChange={(v) => update("restroom", v)}
                  />
                  <Toggle
                    icon={<Shirt className="h-4 w-4" />}
                    label={t("changingRoom")}
                    checked={data.changingRoom}
                    onChange={(v) => update("changingRoom", v)}
                  />
                  <Toggle
                    icon={<Navigation className="h-4 w-4" />}
                    label={t("drone")}
                    checked={data.drone}
                    onChange={(v) => update("drone", v)}
                  />
                  <Toggle
                    icon={<Coins className="h-4 w-4" />}
                    label={t("paidEntry")}
                    checked={data.paid}
                    onChange={(v) => update("paid", v)}
                  />
                  <Toggle
                    icon={<Sparkles className="h-4 w-4" />}
                    label={t("secretSpot")}
                    checked={data.isSecret}
                    onChange={(v) => update("isSecret", v)}
                  />
                </div>
              </fieldset>

              {data.paid && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceMin">{t("priceMin")}</Label>
                    <Input
                      id="priceMin"
                      type="number"
                      min={0}
                      value={data.priceMin}
                      onChange={(e) => update("priceMin", e.target.value)}
                      className="h-11 rounded-lg bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceMax">{t("priceMax")}</Label>
                    <Input
                      id="priceMax"
                      type="number"
                      min={0}
                      value={data.priceMax}
                      onChange={(e) => update("priceMax", e.target.value)}
                      className="h-11 rounded-lg bg-background"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <PhotoUploader
                label={t("inspirationLabel")}
                helperText={t("inspirationHelper")}
                value={data.inspirationPhotos}
                onChange={(p) => update("inspirationPhotos", p)}
              />
              <PhotoUploader
                label={t("technicalLabel")}
                helperText={t("technicalHelper")}
                value={data.technicalPhotos}
                onChange={(p) => update("technicalPhotos", p)}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t pt-5">
            <Button
              variant="outline"
              onClick={back}
              disabled={step === 0 || submitting}
              className="h-12 rounded-xl px-5"
            >
              <ChevronLeft className="me-1 h-4 w-4 rtl:rotate-180" />
              {tCommon("back")}
            </Button>
            {step < STEP_KEYS.length - 1 ? (
              <Button
                onClick={next}
                className="h-12 rounded-xl bg-foreground px-6 text-background hover:bg-foreground/90"
              >
                {tCommon("next")}: {t(STEP_KEYS[step + 1])}
                <ChevronRight className="ms-1 h-4 w-4 rtl:rotate-180" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={submitting}
                className="h-12 rounded-xl px-6"
              >
                {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {t("submitForReview")}
              </Button>
            )}
          </div>
        </div>

        <aside className="w-full max-w-sm space-y-3.5 lg:sticky lg:top-20 lg:max-w-none">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("previewLabel")}
          </p>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="relative aspect-[3/2] bg-muted">
              {previewCover ? (
                <img
                  src={previewCover}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
                  {t("previewNoCover")}
                </span>
              )}
              {data.isSecret && (
                <span className="absolute start-2.5 top-2.5 rounded-md bg-foreground px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-lime">
                  {t("secretSpot")}
                </span>
              )}
            </div>
            <div className="space-y-2 p-4">
              <p className="line-clamp-2 text-[17px] font-semibold">
                {data.title.trim() || (
                  <span className="text-muted-foreground">
                    {t("titlePlaceholder")}
                  </span>
                )}
              </p>
              {data.coords && (
                <p className="text-xs text-muted-foreground">
                  <span dir="ltr">
                    {data.coords.lat.toFixed(4)}, {data.coords.lng.toFixed(4)}
                  </span>
                </p>
              )}
              {data.styleTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tTags(tag)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1 rounded-2xl bg-primary/10 p-4">
            <p className="font-semibold text-primary">
              {t("earnTitle", { points: maxPoints })}
            </p>
            <p className="text-sm text-foreground/80">
              {t("earnHelp", { submit: SUBMIT_POINTS, photo: PHOTO_POINTS })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Toggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-4 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        checked ? "border-primary/40 bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all",
            checked ? "start-[19px]" : "start-[3px]",
          )}
        />
      </span>
    </label>
  );
}
