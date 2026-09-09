import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  FileText,
  Globe,
  LogOut,
  Menu,
  ShieldCheck,
  Moon,
  Settings as SettingsIcon,
  ShoppingCart,
  Sun,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logoUrl from "@/assets/logo.webp";
import { ROLE_LABEL, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/invoices", label: "Invoices", icon: FileText },
] as const;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [today, setToday] = useState("");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  };

  useEffect(() => {
    const stored = localStorage.getItem("nusaybah_theme") === "dark";
    setDark(stored);
    document.documentElement.classList.toggle("dark", stored);
    setToday(
      new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("nusaybah_theme", next ? "dark" : "light");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary text-primary-foreground transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-gold/25 px-5 py-4">
          <img
            src={logoUrl}
            alt="Nusaybah Hub logo"
            className="h-11 w-11 rounded-full bg-primary-foreground object-cover"
          />
          <span className="text-lg font-bold leading-tight">
            Nusaybah <span className="text-gold">Hub</span>
          </span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 text-sm">
          <p className="px-2 pb-1 text-[0.7rem] uppercase tracking-widest text-gold/70">Main</p>
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/dashboard" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold bg-gold/15 text-gold border-l-4 border-gold",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}

          <p className="px-2 pb-1 pt-4 text-[0.7rem] uppercase tracking-widest text-gold/70">
            Settings
          </p>
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
            activeProps={{
              className:
                "flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold bg-gold/15 text-gold border-l-4 border-gold",
            }}
          >
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
          <Link
            to="/staff"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
            activeProps={{
              className:
                "flex items-center gap-3 rounded-lg px-3 py-2.5 font-semibold bg-gold/15 text-gold border-l-4 border-gold",
            }}
          >
            <ShieldCheck className="h-4 w-4" /> {isAdmin ? "Staff & Roles" : "My Team"}
          </Link>

          <p className="px-2 pb-1 pt-4 text-[0.7rem] uppercase tracking-widest text-gold/70">
            Tools
          </p>
          <a
            href="https://yakubnusaiba.github.io/-nusaybah-tools/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
          >
            <Wrench className="h-4 w-4" /> Free Tools
          </a>

          <a
            href="https://yakubnusaiba.github.io/nusaybah-business/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
          >
            <Globe className="h-4 w-4" /> Website
          </a>
        </nav>
        <p className="border-t border-gold/25 px-5 py-3 text-xs text-primary-foreground/60">
          © 2025 Nusaybah Hub
        </p>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card px-4 shadow-sm sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-primary sm:text-xl">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:inline">{today}</span>
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {profile && (
              <div className="flex items-center gap-2 border-l border-border pl-3">
                <div className="hidden text-right leading-tight sm:block">
                  <p className="text-sm font-semibold text-primary">
                    {profile.fullName || profile.email}
                  </p>
                  <p className="text-[0.7rem] uppercase tracking-wide text-gold">
                    {ROLE_LABEL[profile.role]}
                  </p>
                </div>
                <button
                  onClick={signOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h2 className="text-base font-bold text-primary">{title}</h2>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
      )}
      {children}
    </section>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 py-10"
      onClick={onClose}
    >
      <div
        className={`w-full rounded-xl bg-card p-5 shadow-lg ${wide ? "max-w-2xl" : "max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
          <h3 className="font-bold text-primary">{title}</h3>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-sm text-muted-foreground">
      <Boxes className="mx-auto mb-2 h-8 w-8 opacity-40" />
      <p>{message}</p>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30";
export const labelClass = "mb-1 block text-xs font-semibold text-muted-foreground";
export const btn =
  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50";
export const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
export const btnGold = `${btn} bg-gold text-gold-foreground hover:bg-gold/85`;
export const btnSuccess = `${btn} bg-success text-primary-foreground hover:bg-success/90`;
export const btnOutline = `${btn} border border-border text-foreground hover:bg-accent`;
export const btnDanger = `${btn} bg-destructive text-destructive-foreground hover:bg-destructive/90`;
