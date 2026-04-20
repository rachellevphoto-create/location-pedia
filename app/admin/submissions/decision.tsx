"use client";

import * as React from "react";
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

  function decide(payload: any, label: string) {
    start(async () => {
      const res = await decideLocationAction(locationId, payload);
      if (res.ok) toast({ title: label });
      else toast({ title: "Failed", description: res.error, variant: "destructive" });
    });
  }

  if (status !== "PENDING" && status !== "NEEDS_REVISION") {
    return (
      <p className="text-xs text-muted-foreground">
        Status: {status.toLowerCase().replace("_", " ")}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => decide({ decision: "APPROVE" }, "Approved (+points)")}
      >
        {pending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          decide({ decision: "APPROVE_NO_POINTS" }, "Approved (no points)")
        }
      >
        Approve, no points
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={pending}>
            Return for revision
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a revision</DialogTitle>
            <DialogDescription>
              The submitter will receive an email with this feedback.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            placeholder="What needs to change..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={pending || feedback.trim().length < 3}
              onClick={() =>
                decide({ decision: "REVISION", feedback: feedback.trim() }, "Revision requested")
              }
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive" disabled={pending}>
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject submission</DialogTitle>
            <DialogDescription>
              Optional reason. The submitter will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                decide({ decision: "REJECT", reason: reason.trim() || undefined }, "Rejected")
              }
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
