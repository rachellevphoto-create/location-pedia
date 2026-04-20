"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CloudSun,
  Construction,
  Flower,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { addStatusUpdateAction } from "./actions";

type Update = {
  id: string;
  body: string;
  kind: "BLOOM" | "CONSTRUCTION" | "ACCESS" | "WEATHER" | "EVENT" | "OTHER";
  verified: boolean;
  author: string;
  createdAt: string;
};

const KIND_META: Record<Update["kind"], { label: string; icon: React.ComponentType<any> }> = {
  BLOOM: { label: "Bloom", icon: Flower },
  CONSTRUCTION: { label: "Construction", icon: Construction },
  ACCESS: { label: "Access", icon: AlertTriangle },
  WEATHER: { label: "Weather", icon: CloudSun },
  EVENT: { label: "Event", icon: PartyPopper },
  OTHER: { label: "Update", icon: CalendarClock },
};

export function StatusUpdates({
  slug,
  canPost,
  updates,
}: {
  slug: string;
  canPost: boolean;
  updates: Update[];
}) {
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [kind, setKind] = React.useState<Update["kind"]>("OTHER");
  const [pending, start] = React.useTransition();
  const { toast } = useToast();

  function submit() {
    if (body.trim().length < 3) return;
    start(async () => {
      const res = await addStatusUpdateAction(slug, { body: body.trim(), kind });
      if (res.ok) {
        setBody("");
        setOpen(false);
        toast({ title: "Update posted", description: "+10 points awarded." });
      } else {
        toast({
          title: "Could not post",
          description: res.error,
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      {canPost && (
        <div className="rounded-lg border bg-muted/30">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between p-3 text-sm font-medium"
          >
            Post an update
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open && (
            <div className="space-y-3 border-t p-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(KIND_META) as Update["kind"][]).map((k) => {
                  const M = KIND_META[k];
                  const Icon = M.icon;
                  const active = k === kind;
                  return (
                    <button
                      type="button"
                      key={k}
                      onClick={() => setKind(k)}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {M.label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="update-body">What changed?</Label>
                <Textarea
                  id="update-body"
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Bloom is at its peak, parking lot closed..."
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={submit} disabled={pending}>
                  {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Post
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {updates.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No updates yet. Be the first to post.
        </p>
      ) : (
        <ol className="space-y-3">
          {updates.map((u) => {
            const M = KIND_META[u.kind];
            const Icon = M.icon;
            return (
              <li
                key={u.id}
                className="flex gap-3 rounded-lg border bg-card p-3 text-sm"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {u.author}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {M.label}
                    </Badge>
                    {u.verified && (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> Verified
                      </Badge>
                    )}
                    <span>
                      {new Date(u.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{u.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
