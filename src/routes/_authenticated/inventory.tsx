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
import { exportCSV, formatCurrency, generateId, useProducts, type Product } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Nusaybah Hub Business Manager" },
      {
        name: "description",
        content:
          "Track products, prices, categories and stock levels for Nusaybah Hub with low-stock alerts.",
      },
      { property: "og:title", content: "Inventory — Nusaybah Hub" },
      {
        property: "og:description",
        content: "Manage products, prices and stock levels in one place.",
      },
    ],
  }),
  component: InventoryPage,
});

const emptyForm = { name: "", category: "", price: "", qty: "", lowStock: "5" };

function InventoryPage() {
  const { value: products, save } = useProducts();
  const { canDelete } = useAuth();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, query],
  );

  const startAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const startEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      qty: String(p.qty),
      lowStock: String(p.lowStock),
    });
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const record: Product = {
      id: editing ? editing.id : generateId(),
      name: form.name.trim(),
      category: form.category.trim() || "General",
      price: Number(form.price) || 0,
      qty: Number(form.qty) || 0,
      lowStock: Number(form.lowStock) || 0,
    };
    save(editing ? products.map((p) => (p.id === record.id ? record : p)) : [...products, record]);
    setOpen(false);
  };

  const remove = (id: string) => {
    if (confirm("Delete this product?")) save(products.filter((p) => p.id !== id));
  };

  return (
    <AppShell title="Inventory">
      <Card
        title="Product Inventory"
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Search products..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className={btnPrimary} onClick={startAdd}>
              <Plus className="h-4 w-4" /> Add Product
            </button>
            <button className={btnOutline} onClick={() => exportCSV("products", products)}>
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState message="No products yet. Add your first product!" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="rounded-l-lg px-3 py-2">#</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Price (₦)</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="rounded-r-lg px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{p.name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.category}</td>
                    <td className="px-3 py-2.5">₦{formatCurrency(p.price)}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.qty <= p.lowStock
                            ? "bg-destructive/15 text-destructive"
                            : "bg-success/15 text-success"
                        }`}
                      >
                        {p.qty}
                      </span>
                    </td>
                    <td className="flex gap-2 px-3 py-2.5">
                      <button
                        className="text-info hover:opacity-70"
                        onClick={() => startEdit(p)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {canDelete && (
                        <button
                          className="text-destructive hover:opacity-70"
                          onClick={() => remove(p.id)}
                          aria-label="Delete"
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
        title={editing ? "Edit Product" : "Add Product"}
      >
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={labelClass}>Product Name</label>
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Category</label>
              <input
                className={inputClass}
                placeholder="Fashion, Electronics..."
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Price (₦)</label>
              <input
                required
                type="number"
                min="0"
                className={inputClass}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                required
                type="number"
                min="0"
                className={inputClass}
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Low Stock Alert</label>
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.lowStock}
                onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className={`${btnGold} w-full justify-center`}>
            {editing ? "Save Changes" : "Add Product"}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
