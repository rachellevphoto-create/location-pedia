"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { registerAction, type RegisterState } from "./actions";

const initial: RegisterState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        id="fullName"
        label="Full name"
        required
        error={state.fieldErrors?.fullName}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        required
        error={state.fieldErrors?.email}
      />
      <Field
        id="password"
        label="Password"
        type="password"
        required
        error={state.fieldErrors?.password}
      />
      <Field id="phone" label="Phone number" error={state.fieldErrors?.phone} />
      <Field
        id="teacherOrSchool"
        label="Photography teacher or school (helps verification)"
        error={state.fieldErrors?.teacherOrSchool}
      />
      <Field
        id="portfolioUrl"
        label="Portfolio or social media link"
        type="url"
        placeholder="https://..."
        error={state.fieldErrors?.portfolioUrl}
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
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
