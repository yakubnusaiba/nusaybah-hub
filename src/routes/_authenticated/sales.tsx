import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus, Printer, Receipt, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AppShell,
  Card,
  EmptyState,
  Modal,
  btnGold,
  btnOutline,
  btnSuccess,
  inputClass,
  labelClass,
} from "@/components/AppShell";
import {
  exportCSV,
  formatCurrency,
  formatDate,
  generateId,
  printHtml,
  useCustomers,
  useProducts,
  useSales,
  useSettings,
  type Sale,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({
    meta: [
      { title: "Sales — Nusaybah Hub Business Manager" },
      {
        name: "description",
        content:
          "Record sales, auto-update stock and share printable receipts with customers on WhatsApp.",
      },
      { property: "og:title", content: "Sales — Nusaybah Hub" },
      {
        property: "og:description",
        content: "Record every sale and generate receipts in seconds.",
      },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { value: sales, save } = useSales();
  const { value: products, save: saveProducts } = useProducts();
  const { value: customers } = useCustomers();
  const { value: settings } = useSettings();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const [form, setForm] = useState({ productId: "", qty: "1", price: "", customerId: "" });

  const filtered = useMemo(
    () =>
      sales
        .slice()
        .reverse()
        .filter((s) =>
          `${s.productName} ${s.customerName}`.toLowerCase().includes(query.toLowerCase()),
        ),
    [sales, query],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === form.productId);
    if (!product) return;
    const qty = Number(form.qty);
    if (qty > product.qty) {
      alert(`Only ${product.qty} units of ${product.name} in stock.`);
      return;
    }
    const price = Number(form.price) || product.price;
    const customer = customers.find((c) => c.id === form.customerId);

    saveProducts(products.map((p) => (p.id === product.id ? { ...p, qty: p.qty - qty } : p)));
    save([
      ...sales,
      {
        id: generateId(),
        productId: product.id,
        productName: product.name,
        qty,
        price,
        total: price * qty,
        customerId: form.customerId,
        customerName: customer ? customer.name : "Walk-in",
        date: new Date().toISOString(),
      },
    ]);
    setForm({ productId: "", qty: "1", price: "", customerId: "" });
    setOpen(false);
  };

  const receiptNumber = (sale: Sale) =>
    "RCP-" + String(sales.findIndex((s) => s.id === sale.id) + 1).padStart(4, "0");

  const receiptText = (sale: Sale) =>
    `*${settings.storeName}* Receipt ${receiptNumber(sale)}\n${formatDate(sale.date)}\n\n${sale.productName} x${sale.qty} = ₦${formatCurrency(sale.total)}\nCustomer: ${sale.customerName}\n\nThank you for patronizing with us!`;

  return (
    <AppShell title="Sales">
      <Card
        title="Sales Records"
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Search sales..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button className={btnSuccess} onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Record Sale
            </button>
            <button className={btnOutline} onClick={() => exportCSV("sales", sales)}>
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState message="No sales recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="rounded-l-lg px-3 py-2">#</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Amount (₦)</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="rounded-r-lg px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium">{s.productName}</td>
                    <td className="px-3 py-2.5">{s.qty}</td>
                    <td className="px-3 py-2.5 font-semibold text-gold">
                      ₦{formatCurrency(s.total)}
                    </td>
                    <td className="px-3 py-2.5">{s.customerName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(s.date)}</td>
                    <td className="flex gap-2 px-3 py-2.5">
                      <button
                        className="text-info hover:opacity-70"
                        aria-label="Receipt"
                        onClick={() => setReceipt(s)}
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                      <button
                        className="text-destructive hover:opacity-70"
                        aria-label="Delete"
                        onClick={() => {
                          if (confirm("Delete this sale record?"))
                            save(sales.filter((x) => x.id !== s.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Record Sale">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={labelClass}>Product</label>
            <select
              required
              className={inputClass}
              value={form.productId}
              onChange={(e) => {
                const p = products.find((x) => x.id === e.target.value);
                setForm({ ...form, productId: e.target.value, price: p ? String(p.price) : "" });
              }}
            >
              <option value="">Select Product</option>
              {products
                .filter((p) => p.qty > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₦{formatCurrency(p.price)}) — {p.qty} in stock
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                required
                type="number"
                min="1"
                className={inputClass}
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Unit Price (₦)</label>
              <input
                required
                type="number"
                min="0"
                className={inputClass}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Customer</label>
            <select
              className={inputClass}
              value={form.customerId}
              onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.phone ? ` (${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${btnSuccess} w-full justify-center`}>
            Save Sale
          </button>
        </form>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt">
        {receipt && (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm">
              <h4 className="text-lg font-bold text-primary">{settings.storeName}</h4>
              <p className="text-xs text-muted-foreground">{settings.address}</p>
              <p className="text-xs text-muted-foreground">📞 {settings.phone}</p>
              <p className="my-3 text-xs font-semibold tracking-widest text-gold">
                {receiptNumber(receipt)} • {formatDate(receipt.date)}
              </p>
              <div className="border-y border-border py-3 text-left">
                <div className="flex justify-between">
                  <span>
                    {receipt.productName} × {receipt.qty}
                  </span>
                  <span>₦{formatCurrency(receipt.total)}</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  <span>Customer</span>
                  <span>{receipt.customerName}</span>
                </div>
              </div>
              <p className="mt-3 text-base font-bold text-primary">
                Total: ₦{formatCurrency(receipt.total)}
              </p>
              <p className="mt-3 text-xs italic text-gold">
                Thank you for patronizing with us — it means the world to serve you
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                className={btnGold}
                onClick={() =>
                  printHtml(
                    "Receipt",
                    `<h2>${settings.storeName}</h2><p>${settings.address}<br/>${settings.phone}</p>
                     <p><strong>${receiptNumber(receipt)}</strong> · ${formatDate(receipt.date)}</p>
                     <table><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
                     <tbody><tr><td>${receipt.productName}</td><td>${receipt.qty}</td><td>₦${formatCurrency(receipt.total)}</td></tr></tbody></table>
                     <p class="total">Total: ₦${formatCurrency(receipt.total)}</p>
                     <p class="thankyou">Thank you for patronizing with us!</p>`,
                  )
                }
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <a
                className={btnSuccess}
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/?text=${encodeURIComponent(receiptText(receipt))}`}
              >
                Share on WhatsApp
              </a>
              <button className={btnOutline} onClick={() => setReceipt(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
