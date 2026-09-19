import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AppShell,
  Card,
  EmptyState,
  btnOutline,
  inputClass,
} from "@/components/AppShell";
import {
  balanceOf,
  exportCSV,
  formatCurrency,
  formatDate,
  paymentStatus,
  statusClasses,
  useAllSalePayments,
  useCustomers,
  useSales,
  type PaymentStatus,
  type Sale,
  type SalePayment,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "Customer Ledger — Nusaybah Hub Business Manager" },
      {
        name: "description",
        content:
          "See every customer's total billed, amount paid, outstanding balance and full installment payment history.",
      },
      { property: "og:title", content: "Customer Ledger — Nusaybah Hub" },
      {
        property: "og:description",
        content: "Track debts, part-payments and installments for each customer in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LedgerPage,
});

type LedgerRow = {
  key: string;
  name: string;
  phone: string;
  total: number;
  paid: number;
  balance: number;
  status: PaymentStatus;
  sales: Sale[];
};

function LedgerPage() {
  const { value: sales } = useSales();
  const { value: customers } = useCustomers();
  const { value: payments } = useAllSalePayments();

  const [query, setQuery] = useState("");
  const [onlyOwing, setOnlyOwing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const paymentsBySale = useMemo(() => {
    const map = new Map<string, SalePayment[]>();
    payments.forEach((p) => {
      const list = map.get(p.saleId) ?? [];
      list.push(p);
      map.set(p.saleId, list);
    });
    return map;
  }, [payments]);

  const rows = useMemo<LedgerRow[]>(() => {
    const map = new Map<string, LedgerRow>();
    sales.forEach((s) => {
      const key = s.customerId || s.customerName || "walk-in";
      const name = s.customerName || "Walk-in Customer";
      const existing =
        map.get(key) ??
        ({
          key,
          name,
          phone: customers.find((c) => c.id === s.customerId)?.phone ?? "",
          total: 0,
          paid: 0,
          balance: 0,
          status: "Unpaid" as PaymentStatus,
          sales: [],
        } satisfies LedgerRow);
      existing.total += s.total || 0;
      existing.paid += s.amountPaid || 0;
      existing.balance += balanceOf(s);
      existing.sales.push(s);
      map.set(key, existing);
    });

    return [...map.values()]
      .map((r) => ({
        ...r,
        status: (r.paid <= 0
          ? "Unpaid"
          : r.balance <= 0
            ? "Fully Paid"
            : "Partially Paid") as PaymentStatus,
      }))
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
  }, [sales, customers]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          `${r.name} ${r.phone}`.toLowerCase().includes(query.toLowerCase()) &&
          (!onlyOwing || r.balance > 0),
      ),
    [rows, query, onlyOwing],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          total: acc.total + r.total,
          paid: acc.paid + r.paid,
          balance: acc.balance + r.balance,
        }),
        { total: 0, paid: 0, balance: 0 },
      ),
    [rows],
  );

  return (
    <AppShell title="Customer Ledger">
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Total Billed" value={totals.total} tone="text-primary" />
        <StatCard label="Total Received" value={totals.paid} tone="text-success" />
        <StatCard label="Outstanding Balance" value={totals.balance} tone="text-destructive" />
      </div>

      <Card
        title="Customer Balances"
        actions={
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                className={`${inputClass} pl-8`}
                placeholder="Search customer..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              className={btnOutline}
              onClick={() => setOnlyOwing((v) => !v)}
              aria-pressed={onlyOwing}
            >
              {onlyOwing ? "Showing debtors" : "Show debtors only"}
            </button>
            <button
              className={btnOutline}
              onClick={() =>
                exportCSV(
                  "customer-ledger",
                  filtered.map((r) => ({
                    Customer: r.name,
                    Phone: r.phone,
                    Sales: r.sales.length,
                    Total: r.total,
                    Paid: r.paid,
                    Balance: r.balance,
                    Status: r.status,
                  })),
                )
              }
            >
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState message="No customer records yet. Record a sale to build the ledger." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="rounded-l-lg px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Sales</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Balance</th>
                  <th className="rounded-r-lg px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const open = expanded === r.key;
                  return (
                    <>
                      <tr
                        key={r.key}
                        className="cursor-pointer border-b border-border last:border-0 hover:bg-accent/60"
                        onClick={() => setExpanded(open ? null : r.key)}
                      >
                        <td className="px-3 py-2.5 font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {open ? (
                              <ChevronDown className="h-4 w-4 text-gold" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            {r.name}
                          </span>
                          {r.phone && (
                            <span className="block pl-5 text-xs text-muted-foreground">
                              {r.phone}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{r.sales.length}</td>
                        <td className="px-3 py-2.5">₦{formatCurrency(r.total)}</td>
                        <td className="px-3 py-2.5 text-success">₦{formatCurrency(r.paid)}</td>
                        <td className="px-3 py-2.5 font-semibold text-destructive">
                          ₦{formatCurrency(r.balance)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(r.status)}`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr key={`${r.key}-detail`} className="border-b border-border">
                          <td colSpan={6} className="bg-muted/40 px-3 py-4">
                            <div className="space-y-3">
                              {r.sales.map((s) => {
                                const history = paymentsBySale.get(s.id) ?? [];
                                const status = paymentStatus(s);
                                return (
                                  <div
                                    key={s.id}
                                    className="rounded-lg border border-border bg-card p-3"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div>
                                        <p className="text-sm font-semibold text-primary">
                                          {s.productName} × {s.qty}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {formatDate(s.date)}
                                        </p>
                                      </div>
                                      <div className="text-right text-xs">
                                        <p>Total: ₦{formatCurrency(s.total)}</p>
                                        <p className="text-success">
                                          Paid: ₦{formatCurrency(s.amountPaid)}
                                        </p>
                                        <p className="font-semibold text-destructive">
                                          Balance: ₦{formatCurrency(balanceOf(s))}
                                        </p>
                                      </div>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClasses(status)}`}
                                      >
                                        {status}
                                      </span>
                                    </div>

                                    <div className="mt-3 border-t border-border pt-2">
                                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Installments
                                      </p>
                                      {history.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">
                                          No separate installment payments recorded
                                          {s.amountPaid > 0
                                            ? ` — ₦${formatCurrency(s.amountPaid)} paid at sale (${s.paymentMethod}).`
                                            : "."}
                                        </p>
                                      ) : (
                                        <ul className="space-y-1 text-xs">
                                          {history.map((p) => (
                                            <li
                                              key={p.id}
                                              className="flex flex-wrap items-center justify-between gap-2"
                                            >
                                              <span className="text-muted-foreground">
                                                {formatDate(p.date)} · {p.method}
                                                {p.note ? ` · ${p.note}` : ""}
                                              </span>
                                              <span className="font-semibold text-success">
                                                ₦{formatCurrency(p.amount)}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>₦{formatCurrency(value)}</p>
    </div>
  );
}
