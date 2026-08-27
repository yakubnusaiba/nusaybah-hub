import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";

import { AppShell, Card, EmptyState } from "@/components/AppShell";
import {
  formatCurrency,
  formatDate,
  useCustomers,
  useProducts,
  useSales,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Nusaybah Hub — Business Manager Dashboard" },
      {
        name: "description",
        content:
          "Track inventory, sales, customers and revenue for Nusaybah Hub with receipts and invoices in one simple dashboard.",
      },
      { property: "og:title", content: "Nusaybah Hub — Business Manager" },
      {
        property: "og:description",
        content: "Inventory, sales, customers, receipts and invoices for your shop.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { value: products } = useProducts();
  const { value: sales } = useSales();
  const { value: customers } = useCustomers();

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const todayKey = new Date().toDateString();
  const todaySales = sales
    .filter((s) => new Date(s.date).toDateString() === todayKey)
    .reduce((sum, s) => sum + s.total, 0);
  const lowStock = products.filter((p) => p.qty <= p.lowStock);

  const chart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const totals = days.map((d) =>
      sales
        .filter((s) => new Date(s.date).toDateString() === d.toDateString())
        .reduce((sum, s) => sum + s.total, 0),
    );
    const max = Math.max(...totals, 1);
    return days.map((d, i) => ({
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      value: totals[i] ?? 0,
      height: Math.round(((totals[i] ?? 0) / max) * 100),
    }));
  }, [sales]);

  const stats = [
    { label: "Total Products", value: products.length, icon: Boxes, color: "border-l-primary" },
    { label: "Total Sales", value: sales.length, icon: ShoppingCart, color: "border-l-success" },
    { label: "Customers", value: customers.length, icon: Users, color: "border-l-info" },
    {
      label: "Revenue (₦)",
      value: formatCurrency(revenue),
      icon: Wallet,
      color: "border-l-warning",
    },
    {
      label: "Today's Sales (₦)",
      value: formatCurrency(todaySales),
      icon: CalendarDays,
      color: "border-l-gold",
    },
  ];

  return (
    <AppShell title="Dashboard">
      {lowStock.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-warning" />
          <div>
            <p className="font-semibold">Low stock alert</p>
            <p className="text-muted-foreground">
              {lowStock.map((p) => `${p.name} (${p.qty} left)`).join(", ")} —{" "}
              <Link to="/inventory" className="font-semibold text-primary underline">
                restock now
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-xl border border-border ${color} border-l-4 bg-card p-4 shadow-sm`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
            <Icon className="absolute right-3 top-4 h-7 w-7 opacity-10" />
          </div>
        ))}
      </div>

      <Card title="Sales Overview (Last 7 Days)">
        <div className="flex h-48 items-end gap-3">
          {chart.map((d) => (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="text-[0.65rem] text-muted-foreground">
                {d.value ? `₦${formatCurrency(d.value)}` : ""}
              </span>
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-primary to-gold transition-all"
                style={{ height: `${Math.max(d.height, 4)}%`, minHeight: 8 }}
              />
              <span className="text-xs text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent Sales">
        {sales.length === 0 ? (
          <EmptyState message="No recent sales yet." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {sales
              .slice(-5)
              .reverse()
              .map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <Receipt className="h-4 w-4 text-gold" />
                  <div className="flex-1">
                    <p className="font-medium">{s.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.customerName} · {formatDate(s.date)}
                    </p>
                  </div>
                  <span className="font-semibold text-primary">₦{formatCurrency(s.total)}</span>
                </li>
              ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
