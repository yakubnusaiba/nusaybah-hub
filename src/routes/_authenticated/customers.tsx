import { createFileRoute } from "@tanstack/react-router";
import { Download, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/lib/auth";
import {
  AppShell,
  Card,
  EmptyState,
  Modal,
  btnGold,
  btnOutline,
  btnPrimary,
  inputClass,
  labelClass,
} from "@/components/AppShell";
import { exportCSV, generateId, useCustomers, type Customer } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Nusaybah Hub Business Manager" },
      {
        name: "description",
        content: "Keep customer names, phone numbers and addresses organised for quick sales.",
      },
      { property: "og:title", content: "Customers — Nusaybah Hub" },
      {
        property: "og:description",
        content: "A tidy customer directory for your shop records and receipts.",
      },
    ],
  }),
  component: CustomersPage,
});

const emptyForm = { name: "", phone: "", email: "", address: "" };

function CustomersPage() {
  const { value: customers, save } = useCustomers();
  const { canDelete } = useAuth();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(
    () =>
      customers.filter((c) =>
        `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [customers, query],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: Customer = {
      id: editing ? editing.id : generateId(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
    };
    save(
      editing ? customers.map((c) => (c.id === record.id ? record : c)) : [...customers, record],
    );
    setOpen(false);
  };

  return (
    <AppShell title="Customers">
      <Card
        title="Customer Directory"
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Search customers..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              className={btnPrimary}
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add Customer
            </button>
            <button className={btnOutline} onClick={() => exportCSV("customers", customers)}>
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState message="No customers yet. Add your first customer!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="rounded-l-lg px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="rounded-r-lg px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{c.name}</td>
                    <td className="px-3 py-2.5">
                      {c.phone ? (
                        <a className="text-info hover:underline" href={`tel:${c.phone}`}>
                          {c.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{c.address || "—"}</td>
                    <td className="flex gap-2 px-3 py-2.5">
                      <button
                        className="text-info hover:opacity-70"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(c);
                          setForm({
                            name: c.name,
                            phone: c.phone,
                            email: c.email,
                            address: c.address,
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {canDelete && (
                        <button
                          className="text-destructive hover:opacity-70"
                          aria-label="Delete"
                          onClick={() => {
                            if (confirm("Delete this customer?"))
                              save(customers.filter((x) => x.id !== c.id));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Customer" : "Add Customer"}
      >
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={labelClass}>Full Name</label>
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <button type="submit" className={`${btnGold} w-full justify-center`}>
            {editing ? "Save Changes" : "Add Customer"}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
