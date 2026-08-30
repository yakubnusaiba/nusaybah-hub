import { createFileRoute } from "@tanstack/react-router";
import {
  Download,
  ImageDown,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/lib/auth";
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
  PAYMENT_METHODS,
  addSalePayment,
  balanceOf,
  exportCSV,
  fetchSalePayments,
  formatCurrency,
  formatDate,
  generateId,
  paymentStatus,
  printHtml,
  statusClasses,
  downloadNodeAsImage,
  useCustomers,
  useProducts,
  useSales,
  useSettings,
  type Sale,
  type SalePayment,
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
  const { canDelete } = useAuth();

  const { value: products, save: saveProducts } = useProducts();
  const { value: customers } = useCustomers();
  const { value: settings } = useSettings();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    productId: "",
    qty: "1",
    price: "",
    customerId: "",
    amountPaid: "",
    paymentMethod: "Cash",
  });

  const [payFor, setPayFor] = useState<Sale | null>(null);
  const [history, setHistory] = useState<SalePayment[]>([]);
  const [payForm, setPayForm] = useState({ amount: "", method: "Cash", note: "" });
  const [saving, setSaving] = useState(false);

  const liveSale = payFor ? (sales.find((s) => s.id === payFor.id) ?? payFor) : null;

  useEffect(() => {
    if (!payFor) return;
    void fetchSalePayments(payFor.id).then(setHistory);
  }, [payFor, sales]);

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
    const total = price * qty;
    const paid = Math.min(total, Math.max(0, Number(form.amountPaid) || 0));

    saveProducts(products.map((p) => (p.id === product.id ? { ...p, qty: p.qty - qty } : p)));
    save([
      ...sales,
      {
        id: generateId(),
        productId: product.id,
        productName: product.name,
        qty,
        price,
        total,
        amountPaid: paid,
        paymentMethod: form.paymentMethod,
        customerId: form.customerId,
        customerName: customer ? customer.name : "Walk-in",
        date: new Date().toISOString(),
      },
    ]);
    setForm({
      productId: "",
      qty: "1",
      price: "",
      customerId: "",
      amountPaid: "",
      paymentMethod: "Cash",
    });
    setOpen(false);
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveSale) return;
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) return;
    const due = balanceOf(liveSale);
    if (amount > due) {
      alert(`Balance remaining is only ₦${formatCurrency(due)}.`);
      return;
    }
    setSaving(true);
    const ok = await addSalePayment(liveSale, amount, payForm.method, payForm.note);
    setSaving(false);
    if (ok) setPayForm({ amount: "", method: payForm.method, note: "" });
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
                  <th className="px-3 py-2">Total (₦)</th>
                  <th className="px-3 py-2">Paid (₦)</th>
                  <th className="px-3 py-2">Balance (₦)</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Method</th>
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
                    <td className="px-3 py-2.5">₦{formatCurrency(s.amountPaid)}</td>
                    <td className="px-3 py-2.5 font-medium">₦{formatCurrency(balanceOf(s))}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(paymentStatus(s))}`}
                      >
                        {paymentStatus(s)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.paymentMethod}</td>
                    <td className="px-3 py-2.5">{s.customerName}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{formatDate(s.date)}</td>
                    <td className="flex gap-2 px-3 py-2.5">
                      <button
                        className="text-success hover:opacity-70 disabled:opacity-30"
                        aria-label="Add Payment"
                        title="Add Payment"
                        disabled={balanceOf(s) <= 0}
                        onClick={() => {
                          setPayFor(s);
                          setPayForm({ amount: "", method: s.paymentMethod || "Cash", note: "" });
                        }}
                      >
                        <Wallet className="h-4 w-4" />
                      </button>
                      <button
                        className="text-info hover:opacity-70"
                        aria-label="Receipt"
                        onClick={() => setReceipt(s)}
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                      {canDelete && (
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
                      )}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Amount Paid Today (₦)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                className={inputClass}
                value={form.amountPaid}
                onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Payment Method</label>
              <select
                className={inputClass}
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(() => {
            const total = (Number(form.price) || 0) * (Number(form.qty) || 0);
            const paid = Math.min(total, Math.max(0, Number(form.amountPaid) || 0));
            return (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">₦{formatCurrency(total)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Balance remaining</span>
                  <span className="font-semibold">₦{formatCurrency(total - paid)}</span>
                </div>
              </div>
            );
          })()}
          <button type="submit" className={`${btnSuccess} w-full justify-center`}>
            Save Sale
          </button>
        </form>
      </Modal>

      <Modal open={!!liveSale} onClose={() => setPayFor(null)} title="Add Payment">
        {liveSale && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="font-semibold">
                {liveSale.productName} — {liveSale.customerName}
              </p>
              <div className="mt-2 flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span>₦{formatCurrency(liveSale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount paid</span>
                <span>₦{formatCurrency(liveSale.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Balance remaining</span>
                <span>₦{formatCurrency(balanceOf(liveSale))}</span>
              </div>
              <span
                className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(paymentStatus(liveSale))}`}
              >
                {paymentStatus(liveSale)}
              </span>
            </div>

            {history.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-3 text-sm">
                <p className={labelClass}>Payment history</p>
                <ul className="divide-y divide-border">
                  {history.map((p) => (
                    <li key={p.id} className="flex justify-between py-1.5">
                      <span className="text-muted-foreground">
                        {formatDate(p.date)} · {p.method}
                        {p.note ? ` · ${p.note}` : ""}
                      </span>
                      <span className="font-medium">₦{formatCurrency(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {balanceOf(liveSale) > 0 ? (
              <form onSubmit={submitPayment} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Amount (₦)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max={balanceOf(liveSale)}
                      className={inputClass}
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Payment Method</label>
                    <select
                      className={inputClass}
                      value={payForm.method}
                      onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Note (optional)</label>
                  <input
                    className={inputClass}
                    value={payForm.note}
                    onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${btnSuccess} w-full justify-center`}
                >
                  {saving ? "Saving..." : "Record Payment"}
                </button>
              </form>
            ) : (
              <p className="text-center text-sm font-semibold text-success">
                This sale is fully paid.
              </p>
            )}
            <button className={`${btnOutline} w-full justify-center`} onClick={() => setPayFor(null)}>
              Close
            </button>
          </div>
        )}
      </Modal>


      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt">
        {receipt && (
          <div className="space-y-4">
            <div
              ref={receiptRef}
              className="mx-auto max-w-sm rounded-lg bg-white p-6 text-center text-sm text-gray-800"
            >
              <img
                src={logoUrl}
                alt={settings.storeName}
                className="mx-auto h-20 w-20 rounded-full object-cover"
              />
              <h4 className="mt-3 text-2xl font-extrabold text-gray-900">
                {settings.storeName}
              </h4>
              <p className="text-sm text-gray-600">{settings.address}</p>
              <p className="text-sm text-gray-600">📞 {settings.phone}</p>
              <div className="mt-4 flex flex-wrap justify-between gap-y-1 text-left text-sm">
                <span>
                  <strong>Receipt:</strong> {receiptNumber(receipt)}
                </span>
                <span>
                  <strong>Customer:</strong> {receipt.customerName}
                </span>
                <span>
                  <strong>Date:</strong> {formatDate(receipt.date)}
                </span>
              </div>
              <table className="mt-4 w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2">Item</th>
                    <th className="border border-gray-300 px-3 py-2">Qty</th>
                    <th className="border border-gray-300 px-3 py-2">Price</th>
                    <th className="border border-gray-300 px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 px-3 py-2">
                      {receipt.productName}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">{receipt.qty}</td>
                    <td className="border border-gray-300 px-3 py-2">
                      ₦{formatCurrency(receipt.qty > 0 ? receipt.total / receipt.qty : receipt.total)}
                    </td>
                    <td className="border border-gray-300 px-3 py-2">
                      ₦{formatCurrency(receipt.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-4 text-right text-2xl font-extrabold text-gray-900">
                Total: ₦{formatCurrency(receipt.total)}
              </p>
              {balanceOf(receipt) > 0 || receipt.amountPaid < receipt.total ? (
                <div className="mt-2 text-right text-sm">
                  <p>Paid: ₦{formatCurrency(receipt.amountPaid)}</p>
                  <p className="font-semibold">
                    Balance: ₦{formatCurrency(balanceOf(receipt))}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(paymentStatus(receipt))}`}
                  >
                    {paymentStatus(receipt)}
                  </span>
                </div>
              ) : null}
              <hr className="my-4 border-gray-200" />
              <p className="text-sm italic text-gray-700">
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
              <button
                className={btnOutline}
                onClick={() => {
                  if (receiptRef.current)
                    void downloadNodeAsImage(receiptRef.current, receiptNumber(receipt));
                }}
              >
                <ImageDown className="h-4 w-4" /> Download Image
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
