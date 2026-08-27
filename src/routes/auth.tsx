import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";

import logoAsset from "@/assets/logo.webp.asset.json";
import { btnGold, btnOutline, inputClass, labelClass } from "@/components/AppShell";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In — Nusaybah Hub Manager" },
      {
        name: "description",
        content:
          "Secure staff sign in for the Nusaybah Hub business manager: inventory, sales, customers and invoices.",
      },
      { property: "og:title", content: "Staff Sign In — Nusaybah Hub Manager" },
      {
        property: "og:description",
        content: "Secure staff sign in for the Nusaybah Hub business manager.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    if (mode === "signup") {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName, phone },
        },
      });
      if (err) setError(err.message);
      else if (!data.session)
        setMessage("Account created. Check your email to confirm, then sign in.");
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    }
    setBusy(false);
  };

  const google = async () => {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setError("Google sign-in failed. Please try again.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logoAsset.url} alt="Nusaybah Hub logo" className="h-20 w-20 object-contain" />
          <h1 className="mt-3 text-xl font-bold text-primary">
            Nusaybah <span className="text-gold">Hub</span> Manager
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your staff account" : "Create your staff account"}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div>
                <label className={labelClass} htmlFor="fullName">
                  Full name
                </label>
                <input
                  id="fullName"
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <label className={labelClass} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          {message && <p className="text-sm font-medium text-success">{message}</p>}

          <button type="submit" className={`${btnGold} w-full justify-center`} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "signin" ? (
              <LogIn className="h-4 w-4" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <button onClick={google} className={`${btnOutline} w-full justify-center`}>
          Continue with Google
        </button>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New staff member?" : "Already have an account?"}{" "}
          <button
            className="font-semibold text-primary underline-offset-2 hover:underline"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          The first account created becomes the Admin. New accounts join as Staff until an admin
          upgrades them.
        </p>
      </div>
    </main>
  );
}
