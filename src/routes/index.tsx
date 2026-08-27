import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Boxes, FileText, ShieldCheck, ShoppingCart, Users } from "lucide-react";

import logoAsset from "@/assets/logo.webp.asset.json";
import { btnGold, btnOutline } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nusaybah Hub Manager — Inventory, Sales & Invoices" },
      {
        name: "description",
        content:
          "The Nusaybah Hub staff workspace: track inventory, record sales, manage customers and issue invoices from any device.",
      },
      { property: "og:title", content: "Nusaybah Hub Manager" },
      {
        property: "og:description",
        content:
          "Staff workspace for Nusaybah Hub: inventory, sales, customers and invoices in one place.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Boxes, title: "Inventory", text: "Stock levels with low-stock alerts." },
  { icon: ShoppingCart, title: "Sales", text: "Record sales and share receipts instantly." },
  { icon: Users, title: "Customers", text: "Keep every client's details on hand." },
  { icon: FileText, title: "Invoices", text: "Generate and print professional invoices." },
];

function Landing() {
  return (
    <main className="min-h-screen bg-primary text-primary-foreground">
      <div className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        <div className="flex flex-col items-center text-center">
          <img src={logoAsset.url} alt="Nusaybah Hub logo" className="h-28 w-28 object-contain" />
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
            Nusaybah <span className="text-gold">Hub</span> Business Manager
          </h1>
          <p className="mt-3 max-w-xl text-primary-foreground/75">
            One shared workspace for the whole team — inventory, sales, customers and invoices,
            synced securely across every device.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/auth" className={btnGold}>
              Staff sign in
            </Link>
            <Link to="/dashboard" className={`${btnOutline} border-gold/50 text-gold`}>
              Open dashboard
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-xl border border-gold/25 bg-primary-foreground/5 p-5">
              <Icon className="h-5 w-5 text-gold" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-primary-foreground/70">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex items-start gap-3 rounded-xl border border-gold/25 p-5 text-sm text-primary-foreground/75">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
          <p>
            Access is role-based: <strong className="text-gold">Admins</strong> manage staff and
            store settings, <strong className="text-gold">Managers</strong> can remove records, and{" "}
            <strong className="text-gold">Staff</strong> handle day-to-day sales and stock.
          </p>
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-primary-foreground/50">
          <BarChart3 className="h-3.5 w-3.5" /> © 2025 Nusaybah Hub · 08105257672
        </p>
      </div>
    </main>
  );
}
