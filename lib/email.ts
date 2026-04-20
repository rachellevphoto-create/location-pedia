import { Resend } from "resend";
import { renderUserApprovedEmail } from "@/emails/user-approved";
import { renderUserRejectedEmail } from "@/emails/user-rejected";
import { renderLocationApprovedEmail } from "@/emails/location-approved";
import { renderLocationRejectedEmail } from "@/emails/location-rejected";
import { renderLocationRevisionEmail } from "@/emails/location-revision";
import { renderWelcomeEmail } from "@/emails/welcome";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "PhotoLoc <noreply@example.com>";
const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

const resend = apiKey ? new Resend(apiKey) : null;

async function sendEmail(args: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.info(`[email:dev] -> ${args.to} | ${args.subject}\n${args.html}`);
    return { ok: true, devOnly: true };
  }
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
  if (error) {
    console.error("Resend error", error);
    return { ok: false, error };
  }
  return { ok: true };
}

export async function sendWelcome(to: string, fullName: string) {
  return sendEmail({
    to,
    subject: "Welcome to PhotoLoc - awaiting approval",
    html: await renderWelcomeEmail({ fullName }),
  });
}

export async function sendUserApproved(to: string, fullName: string) {
  return sendEmail({
    to,
    subject: "Your PhotoLoc account has been approved",
    html: await renderUserApprovedEmail({ fullName, baseUrl }),
  });
}

export async function sendUserRejected(to: string, fullName: string, reason?: string) {
  return sendEmail({
    to,
    subject: "PhotoLoc account update",
    html: await renderUserRejectedEmail({ fullName, reason }),
  });
}

export async function sendLocationApproved(args: {
  to: string;
  fullName: string;
  title: string;
  slug: string;
  awardedPoints: boolean;
}) {
  return sendEmail({
    to: args.to,
    subject: `Approved: ${args.title}`,
    html: await renderLocationApprovedEmail({ ...args, baseUrl }),
  });
}

export async function sendLocationRevision(args: {
  to: string;
  fullName: string;
  title: string;
  slug: string;
  feedback: string;
}) {
  return sendEmail({
    to: args.to,
    subject: `Revision requested: ${args.title}`,
    html: await renderLocationRevisionEmail({ ...args, baseUrl }),
  });
}

export async function sendLocationRejected(args: {
  to: string;
  fullName: string;
  title: string;
  reason?: string;
}) {
  return sendEmail({
    to: args.to,
    subject: `Submission update: ${args.title}`,
    html: await renderLocationRejectedEmail(args),
  });
}
