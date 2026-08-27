import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/oauth-callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Nusaybah Hub Manager" },
      { name: "description", content: "Completing secure staff sign in for Nusaybah Hub Manager." },
      { property: "og:title", content: "Signing you in — Nusaybah Hub Manager" },
      { property: "og:description", content: "Completing secure staff sign in." },
    ],
  }),
  component: OAuthCallback,
});

function OAuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      void navigate({ to: "/dashboard", replace: true });
    };
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    const timer = setTimeout(() => {
      if (!done) setError("Sign in did not complete. Please try again.");
    }, 8000);
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-primary px-4 text-primary-foreground">
      {error ? (
        <>
          <p className="text-sm font-medium">{error}</p>
          <a href="/auth" className="text-sm font-semibold text-gold underline">
            Back to sign in
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <p className="text-sm">Signing you in…</p>
        </>
      )}
    </main>
  );
}
