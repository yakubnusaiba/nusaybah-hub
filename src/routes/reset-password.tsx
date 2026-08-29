import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, LogIn } from "lucide-react";


import logoUrl from "@/assets/logo.webp";
import { btnGold, inputClass, labelClass } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset Password — Nusaybah Hub Manager" },
      {
        name: "description",
        content: "Choose a new password for your Nusaybah Hub Manager staff account.",
      },
      { property: "og:title", content: "Reset Password — Nusaybah Hub Manager" },
      {
        property: "og:description",
        content: "Choose a new password for your staff account.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage(null);
    setDone(true);
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-card p-6 text-center shadow-xl sm:p-8">
          <img
            src={logoUrl}
            alt="Nusaybah Hub logo"
            className="mx-auto h-16 w-16 rounded-full border-2 border-gold/50 object-cover"
          />
          <CheckCircle2 className="mx-auto mt-5 h-14 w-14 text-success" />
          <h1 className="mt-4 text-xl font-bold text-primary">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your new password is active. You can sign in to your staff account right away.
          </p>
          <button
            className={`${btnGold} mt-6 w-full justify-center`}
            onClick={() => void navigate({ to: "/dashboard", replace: true })}
          >
            <LogIn className="h-4 w-4" /> Continue to dashboard
          </button>
          <a
            href="/auth"
            className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src={logoUrl}
            alt="Nusaybah Hub logo"
            className="h-20 w-20 rounded-full border-2 border-gold/50 object-cover"
          />
          <h1 className="mt-3 text-xl font-bold text-primary">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready
              ? "Enter a new password for your staff account."
              : "Open this page from the reset link in your email."}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={labelClass} htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
              disabled={!ready}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={6}
              required
              disabled={!ready}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          {message && <p className="text-sm font-medium text-success">{message}</p>}

          <button
            type="submit"
            className={`${btnGold} w-full justify-center`}
            disabled={busy || !ready}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Update password
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          <a href="/auth" className="font-semibold text-primary underline-offset-2 hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </main>
  );
}
