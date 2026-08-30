import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "staff";

export type StaffProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: AppRole;
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadProfile = async (userId: string, email: string) => {
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (!active) return;
      const rank: AppRole[] = ["admin", "manager", "staff"];
      const owned = (roles ?? []).map((r) => r.role as AppRole);
      const role = rank.find((r) => owned.includes(r)) ?? "staff";
      setProfile({
        id: userId,
        fullName: p?.full_name ?? "",
        phone: p?.phone ?? "",
        email: p?.email ?? email,
        role,
      });
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        void loadProfile(next.user.id, next.user.email ?? "");
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user.id, data.session.user.email ?? "");
      } else {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const role = profile?.role ?? null;

  return {
    session,
    profile,
    loading,
    role,
    isAdmin: role === "admin",
    isManager: role === "manager",
    canDelete: role === "admin" || role === "manager",
  } as const;
}

export const APPROVAL_MESSAGE = {
  pending: "Your account is waiting for admin approval. Please wait.",
  rejected: "Your account has been rejected. Please contact the admin.",
} as const;

/**
 * Returns null when the signed-in account is approved. Otherwise signs the user
 * back out and returns the message to show on the sign-in screen.
 */
export async function enforceApproval(): Promise<string | null> {
  const { data, error } = await (
    supabase.rpc as unknown as (fn: string) => Promise<{ data: string | null; error: unknown }>
  )("my_status");
  if (error) return null;
  const status = data ?? "approved";
  if (status === "approved") return null;
  await supabase.auth.signOut();
  return status === "rejected" ? APPROVAL_MESSAGE.rejected : APPROVAL_MESSAGE.pending;
}
