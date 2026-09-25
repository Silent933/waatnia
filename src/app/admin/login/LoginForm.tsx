"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { login, type LoginState } from "@/app/actions/admin-auth";

const initialState: LoginState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary w-full" disabled={pending}>
      {pending ? "جارٍ الدخول…" : "تسجيل الدخول"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="card p-6">
      <div>
        <label className="label" htmlFor="email">البريد الإلكتروني</label>
        <input id="email" name="email" type="email" className="field" required autoComplete="username" dir="ltr" />
      </div>
      <div className="mt-4">
        <label className="label" htmlFor="password">كلمة المرور</label>
        <input id="password" name="password" type="password" className="field" required autoComplete="current-password" dir="ltr" />
      </div>

      {state.error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="mt-5">
        <Submit />
      </div>
    </form>
  );
}
