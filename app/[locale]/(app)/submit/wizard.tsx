"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Bike,
  Bus,
  Camera,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Coins,
  Loader2,
  MapPin,
  Navigation,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
const STEP_ICONS = [ClipboardList, MapPin, Sparkles, Camera] as const;

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

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-3 text-sm">
        {STEP_KEYS.map((key, i) => {
          const Icon = STEP_ICONS[i];
          const active = i === step;
          const done = i < step;
          return (
            <li key={key} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-primary text-primary"
                      : "border-muted-foreground/40 text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={
                  active
                    ? "font-medium"
                    : "hidden text-muted-foreground sm:inline"
                }
              >
                {t(key)}
              </span>
              {i < STEP_KEYS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 rtl:rotate-180" />
              )}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>{t(STEP_KEYS[step])}</CardTitle>
          <CardDescription>{t(STEP_DESC[step])}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="title">{t("fieldTitle")}</Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder={t("titlePlaceholder")}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">{t("fieldDescription")}</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={data.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
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
            <div className="space-y-4">
              <MapPicker
                value={data.coords}
                onChange={(c) => update("coords", c)}
              />
              <div className="space-y-1.5">
                <Label htmlFor="directions">{t("fieldDirections")}</Label>
                <Textarea
                  id="directions"
                  rows={4}
                  value={data.directions}
                  onChange={(e) => update("directions", e.target.value)}
                  placeholder={t("directionsPlaceholder")}
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
                        variant={
                          data.styleTags.includes(tag) ? "default" : "outline"
                        }
                      >
                        {tTags(tag)}
                      </Badge>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  icon={<Bike className="h-4 w-4" />}
                  label={t("restroom")}
                  checked={data.restroom}
                  onChange={(v) => update("restroom", v)}
                />
                <Toggle
                  icon={<Camera className="h-4 w-4" />}
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
              </fieldset>

              {data.paid && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="priceMin">{t("priceMin")}</Label>
                    <Input
                      id="priceMin"
                      type="number"
                      min={0}
                      value={data.priceMin}
                      onChange={(e) => update("priceMin", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="priceMax">{t("priceMax")}</Label>
                    <Input
                      id="priceMax"
                      type="number"
                      min={0}
                      value={data.priceMax}
                      onChange={(e) => update("priceMax", e.target.value)}
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
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0 || submitting}>
          <ChevronLeft className="me-1 h-4 w-4 rtl:rotate-180" />{" "}
          {tCommon("back")}
        </Button>
        {step < STEP_KEYS.length - 1 ? (
          <Button onClick={next}>
            {tCommon("next")}{" "}
            <ChevronRight className="ms-1 h-4 w-4 rtl:rotate-180" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("submitForReview")}
          </Button>
        )}
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
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </label>
  );
}
