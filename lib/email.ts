import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import {
  renderUserApprovedEmail,
  userApprovedSubject,
} from "@/emails/user-approved";
import {
  renderUserRejectedEmail,
  userRejectedSubject,
} from "@/emails/user-rejected";
import {
  renderLocationApprovedEmail,
  locationApprovedSubject,
} from "@/emails/location-approved";
import {
  renderLocationRejectedEmail,
  locationRejectedSubject,
} from "@/emails/location-rejected";
import {
  renderLocationRevisionEmail,
  locationRevisionSubject,
} from "@/emails/location-revision";
import { renderWelcomeEmail, welcomeSubject } from "@/emails/welcome";
import type { EmailLocale } from "@/emails/_layout";

const apiKey = process.env.RESEND_API_KEY;
const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";

const smtpUser = process.env.SMTP_USER ?? process.env.GMAIL_USER ?? "";
const smtpPass = process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD ?? "";
const smtpHost = process.env.SMTP_HOST ?? (smtpUser ? "smtp.gmail.com" : "");
const smtpPort = Number(process.env.SMTP_PORT ?? 465);
const smtpSecure = (process.env.SMTP_SECURE ?? "true") === "true";

const useSmtp = Boolean(smtpUser && smtpPass && smtpHost);

const from =
  process.env.EMAIL_FROM ??
  (useSmtp ? `LocatePedia <${smtpUser}>` : "LocatePedia <noreply@example.com>");

const resend = apiKey && !useSmtp ? new Resend(apiKey) : null;

let smtpTransport: Transporter | null = null;
function getSmtp(): Transporter | null {
  if (!useSmtp) return null;
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    });
  }
  return smtpTransport;
}

function normalizeLocale(loc?: string | null): EmailLocale {
  return loc === "en" ? "en" : "he";
}

async function sendEmail(args: { to: string; subject: string; html: string }) {
  const smtp = getSmtp();
  if (smtp) {
    console.info(
      `[email:smtp] sending -> ${args.to} | ${args.subject} | from=${from}`,
    );
    try {
      const info = await smtp.sendMail({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
      });
      console.info(
        `[email:smtp] sent ok -> ${args.to} (id=${info.messageId ?? "?"})`,
      );
      return { ok: true as const };
    } catch (err) {
      console.error(`[email:smtp] send threw for ${args.to}:`, err);
      return { ok: false as const, error: err };
    }
  }

  if (!resend) {
    console.info(
      `[email:dev] (no RESEND_API_KEY and no SMTP) -> ${args.to} | ${args.subject}`,
    );
    return { ok: true as const, devOnly: true as const };
  }
  console.info(
    `[email:resend] sending -> ${args.to} | ${args.subject} | from=${from}`,
  );
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (error) {
      console.error(
        `[email:resend] error for ${args.to}:`,
        JSON.stringify(error, null, 2),
      );
      return { ok: false as const, error };
    }
    console.info(
      `[email:resend] sent ok -> ${args.to} (id=${data?.id ?? "?"})`,
    );
    return { ok: true as const };
  } catch (err) {
    console.error(`[email:resend] send threw for ${args.to}:`, err);
    return { ok: false as const, error: err };
  }
}

export async function sendWelcome(
  to: string,
  fullName: string,
  locale?: string | null,
) {
  const lc = normalizeLocale(locale);
  return sendEmail({
    to,
    subject: welcomeSubject(lc),
    html: await renderWelcomeEmail({ fullName, locale: lc }),
  });
}

export async function sendUserApproved(
  to: string,
  fullName: string,
  locale?: string | null,
) {
  const lc = normalizeLocale(locale);
  return sendEmail({
    to,
    subject: userApprovedSubject(lc),
    html: await renderUserApprovedEmail({ fullName, baseUrl, locale: lc }),
  });
}

export async function sendUserRejected(
  to: string,
  fullName: string,
  reason?: string,
  locale?: string | null,
) {
  const lc = normalizeLocale(locale);
  return sendEmail({
    to,
    subject: userRejectedSubject(lc),
    html: await renderUserRejectedEmail({ fullName, reason, locale: lc }),
  });
}

export async function sendLocationApproved(args: {
  to: string;
  fullName: string;
  title: string;
  slug: string;
  awardedPoints: boolean;
  locale?: string | null;
}) {
  const lc = normalizeLocale(args.locale);
  return sendEmail({
    to: args.to,
    subject: locationApprovedSubject(lc, args.title),
    html: await renderLocationApprovedEmail({ ...args, baseUrl, locale: lc }),
  });
}

export async function sendLocationRevision(args: {
  to: string;
  fullName: string;
  title: string;
  slug: string;
  feedback: string;
  locale?: string | null;
}) {
  const lc = normalizeLocale(args.locale);
  return sendEmail({
    to: args.to,
    subject: locationRevisionSubject(lc, args.title),
    html: await renderLocationRevisionEmail({ ...args, baseUrl, locale: lc }),
  });
}

export async function sendLocationRejected(args: {
  to: string;
  fullName: string;
  title: string;
  reason?: string;
  locale?: string | null;
}) {
  const lc = normalizeLocale(args.locale);
  return sendEmail({
    to: args.to,
    subject: locationRejectedSubject(lc, args.title),
    html: await renderLocationRejectedEmail({ ...args, locale: lc }),
  });
}
