import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

import { AppShell, Card, EmptyState, inputClass } from "@/components/AppShell";
import { ROLE_LABEL, useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Staff & Roles — Nusaybah Hub Manager" },
      {
        name: "description",
        content: "Manage which staff members can access the Nusaybah Hub workspace and what they can do.",
      },
      { property: "og:title", content: "Staff & Roles — Nusaybah Hub Manager" },
      { property: "og:description", content: "Manage staff access and roles for Nusaybah Hub." },
    ],
  }),
  component: StaffPage,
});

type StaffRow = { id: string; fullName: string; email: string; phone: string; role: AppRole };

function StaffPage() {
  const { isAdmin, profile } = useAuth();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const rank: AppRole[] = ["admin", "manager", "staff"];
    setRows(
      (profiles ?? []).map((p) => {
        const owned = (roles ?? [])
          .filter((r) => r.user_id === p.id)
          .map((r) => r.role as AppRole);
        return {
          id: p.id,
          fullName: p.full_name || "(no name)",
          email: p.email,
          phone: p.phone,
          role: rank.find((r) => owned.includes(r)) ?? "staff",
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeRole = async (userId: string, role: AppRole) => {
    setNotice(null);
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) {
      setNotice("Only an admin can change roles.");
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) setNotice("Could not update this role. Please try again.");
    else setNotice("Role updated.");
    await load();
  };

  return (
    <AppShell title="Staff & Roles">
      <Card title="Team members">
        {!isAdmin && (
          <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Only admins can change roles. You are signed in as{" "}
            <strong>{profile ? ROLE_LABEL[profile.role] : "Staff"}</strong>.
          </p>
        )}
        {notice && <p className="mb-4 text-sm font-medium text-primary">{notice}</p>}
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading team…</p>
        ) : rows.length === 0 ? (
          <EmptyState message="No staff accounts yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Phone</th>
                  <th className="py-2 pr-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2.5 pr-3 font-medium">
                      {r.fullName}
                      {r.id === profile?.id && <span className="ml-2 text-xs text-gold">You</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.email}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{r.phone || "—"}</td>
                    <td className="py-2.5 pr-3">
                      {isAdmin ? (
                        <select
                          className={`${inputClass} max-w-[10rem]`}
                          value={r.role}
                          onChange={(e) => void changeRole(r.id, e.target.value as AppRole)}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      ) : (
                        <span className="font-semibold text-primary">{ROLE_LABEL[r.role]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="What each role can do">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              <strong className="text-foreground">Admin</strong> — everything, including store
              settings and staff roles.
            </span>
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              <strong className="text-foreground">Manager</strong> — full day-to-day access and can
              delete records, but cannot change settings or roles.
            </span>
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span>
              <strong className="text-foreground">Staff</strong> — add and edit products, sales,
              customers and invoices. Cannot delete records.
            </span>
          </li>
        </ul>
      </Card>
    </AppShell>
  );
}
