"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerAction, type RegisterState } from "./actions";

const initial: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("Auth");
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t("creatingAccount") : t("createAccountSubmit")}
    </Button>
  );
}

export function RegisterForm() {
  const t = useTranslations("Auth");
  const tv = useTranslations("Auth.validation");
  const [state, formAction] = useFormState(registerAction, initial);

  function translateError(code?: string): string | undefined {
    if (!code) return undefined;
    if (code.startsWith("v:")) {
      const key = code.slice(2);
      try {
        return tv(key as any);
      } catch {
        try {
          return t(key as any);
        } catch {
          return code;
        }
      }
    }
    return code;
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field
        id="fullName"
        label={t("fullNameLabel")}
        required
        error={translateError(state.fieldErrors?.fullName)}
      />
      <Field
        id="email"
        label={t("emailLabel")}
        type="email"
        required
        error={translateError(state.fieldErrors?.email)}
      />
      <Field
        id="password"
        label={t("passwordLabel")}
        type="password"
        required
        error={translateError(state.fieldErrors?.password)}
      />
      <Field
        id="phone"
        label={t("phoneLabel")}
        error={translateError(state.fieldErrors?.phone)}
      />
      <Field
        id="teacherOrSchool"
        label={t("teacherLabel")}
        error={translateError(state.fieldErrors?.teacherOrSchool)}
      />
      <Field
        id="portfolioUrl"
        label={t("portfolioLabel")}
        type="url"
        placeholder={t("portfolioPlaceholder")}
        error={translateError(state.fieldErrors?.portfolioUrl)}
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {translateError(state.error) ?? state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

function Field({
  id,
  label,
  error,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...props} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
