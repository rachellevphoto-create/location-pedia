"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bike, Bus, Camera, ChevronLeft, ChevronRight, ClipboardList, Coins, Loader2, MapPin, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { MapPicker } from "@/components/map-picker";
import { PhotoUploader, type UploadedPhoto } from "@/components/photo-uploader";
import { STYLE_TAGS } from "@/lib/validation";
import { submitLocationAction } from "./actions";

type WizardData = {
  title: string;
  description: string;
  coords: { lat: number; lng: number } | null;
  styleTags: string[];
  wheelchair: boolean;
  publicTransport: boolean;
  restroom: boolean;
  changingRoom: boolean;
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
  coords: null,
  styleTags: [],
  wheelchair: false,
  publicTransport: false,
  restroom: false,
  changingRoom: false,
  paid: false,
  priceMin: "",
  priceMax: "",
  isSecret: false,
  inspirationPhotos: [],
  technicalPhotos: [],
};

const steps = [
  { id: "basics", label: "Basics", icon: ClipboardList },
  { id: "location", label: "Location", icon: MapPin },
  { id: "details", label: "Details", icon: Sparkles },
  { id: "photos", label: "Photos", icon: Camera },
] as const;

export function SubmitWizard() {
  const router = useRouter();
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
      if (data.title.trim().length < 3) return "Title must be at least 3 chars.";
      if (data.description.trim().length < 20)
        return "Description must be at least 20 chars.";
    }
    if (idx === 1 && !data.coords) return "Drop a pin on the map.";
    if (idx === 3 && data.inspirationPhotos.length + data.technicalPhotos.length === 0)
      return "Add at least one photo.";
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast({ title: "Hold on", description: err, variant: "destructive" });
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    const finalErr =
      validateStep(0) ?? validateStep(1) ?? validateStep(3);
    if (finalErr) {
      toast({ title: "Cannot submit", description: finalErr, variant: "destructive" });
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
        latitude: data.coords!.lat,
        longitude: data.coords!.lng,
        wheelchair: data.wheelchair,
        publicTransport: data.publicTransport,
        restroom: data.restroom,
        changingRoom: data.changingRoom,
        paid: data.paid,
        priceMin: data.priceMin ? Number(data.priceMin) : null,
        priceMax: data.priceMax ? Number(data.priceMax) : null,
        styleTags: data.styleTags,
        isSecret: data.isSecret,
        photos,
      });
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast({
          title: "Could not submit",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "Submission failed",
        description: e?.message ?? "Try again",
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
        {steps.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <li key={s.id} className="flex items-center gap-2">
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
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </li>
          );
        })}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step].label}</CardTitle>
          <CardDescription>
            {step === 0 && "Tell photographers what makes this spot worth visiting."}
            {step === 1 && "Drop the exact pin so people can navigate to it."}
            {step === 2 && "Add filters and accessibility info."}
            {step === 3 && "Inspiration shots are watermarked. Technical shots show the real terrain."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={data.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder="Old Jaffa stone stairs"
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={data.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="What does it look like, when is it best, what gear do you need..."
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description}</p>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <MapPicker value={data.coords} onChange={(c) => update("coords", c)} />
          )}

          {step === 2 && (
            <>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Style tags</legend>
                <div className="flex flex-wrap gap-2">
                  {STYLE_TAGS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => toggleTag(t)}
                      className="focus:outline-none"
                    >
                      <Badge
                        variant={data.styleTags.includes(t) ? "default" : "outline"}
                      >
                        {t}
                      </Badge>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Toggle
                  icon={<Users className="h-4 w-4" />}
                  label="Wheelchair friendly"
                  checked={data.wheelchair}
                  onChange={(v) => update("wheelchair", v)}
                />
                <Toggle
                  icon={<Bus className="h-4 w-4" />}
                  label="Public transport"
                  checked={data.publicTransport}
                  onChange={(v) => update("publicTransport", v)}
                />
                <Toggle
                  icon={<Bike className="h-4 w-4" />}
                  label="Restroom nearby"
                  checked={data.restroom}
                  onChange={(v) => update("restroom", v)}
                />
                <Toggle
                  icon={<Camera className="h-4 w-4" />}
                  label="Changing room"
                  checked={data.changingRoom}
                  onChange={(v) => update("changingRoom", v)}
                />
                <Toggle
                  icon={<Coins className="h-4 w-4" />}
                  label="Paid entry"
                  checked={data.paid}
                  onChange={(v) => update("paid", v)}
                />
                <Toggle
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Secret spot"
                  checked={data.isSecret}
                  onChange={(v) => update("isSecret", v)}
                />
              </fieldset>

              {data.paid && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="priceMin">Price min</Label>
                    <Input
                      id="priceMin"
                      type="number"
                      min={0}
                      value={data.priceMin}
                      onChange={(e) => update("priceMin", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="priceMax">Price max</Label>
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
                label="Inspiration photos (will be watermarked)"
                helperText="Polished shots that show what's possible at this spot."
                value={data.inspirationPhotos}
                onChange={(p) => update("inspirationPhotos", p)}
              />
              <PhotoUploader
                label="Technical / behind-the-scenes photos"
                helperText="Wide shots of the actual terrain so others know what to expect."
                value={data.technicalPhotos}
                onChange={(p) => update("technicalPhotos", p)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={back} disabled={step === 0 || submitting}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={next}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for review
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
