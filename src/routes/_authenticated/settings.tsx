import { createFileRoute } from "@tanstack/react-router";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AppShell,
  Card,
  btnDanger,
  btnGold,
  inputClass,
  labelClass,
} from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { defaultSettings, useSettings } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Nusaybah Hub Business Manager" },
      {
        name: "description",
        content: "Update your store name, address and contact details used on receipts.",
      },
      { property: "og:title", content: "Settings — Nusaybah Hub" },
      {
        property: "og:description",
        content: "Store details that appear on every invoice and receipt.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { value, save, hydrated } = useSettings();
  const [form, setForm] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (hydrated) setForm(value);
  }, [hydrated, value]);

  return (
    <AppShell title="Settings">
      {!isAdmin && (
        <p className="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
          Store details are read-only. Ask an admin to make changes.
        </p>
      )}
      <Card title="Store Details">
        <form
          className="max-w-xl space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          <div>
            <label className={labelClass}>Store Name</label>
            <input
              className={inputClass}
              disabled={!isAdmin}
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              className={inputClass}
              disabled={!isAdmin}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                className={inputClass}
              disabled={!isAdmin}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
              disabled={!isAdmin}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className={btnGold} disabled={!isAdmin}>
              <Save className="h-4 w-4" /> Save Settings
            </button>
            {saved && <span className="text-sm font-medium text-success">Saved!</span>}
          </div>
        </form>
      </Card>

      {isAdmin && (
        <Card title="Data">
          <p className="mb-3 text-sm text-muted-foreground">
            All records are shared with your staff in the cloud. Clearing data cannot be undone.
          </p>
          <button
            className={btnDanger}
            onClick={async () => {
              if (!confirm("Erase all products, sales, customers and invoices?")) return;
              await supabase.from("invoices").delete().neq("id", "00000000-0000-0000-0000-000000000000");
              await supabase.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
              await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
              await supabase.from("customers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
              location.reload();
            }}
          >
            <Trash2 className="h-4 w-4" /> Clear All Data
          </button>
        </Card>
      )}
    </AppShell>
  );
}
