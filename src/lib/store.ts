import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  qty: number;
  lowStock: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type Sale = {
  id: string;
  productId: string;
  productName: string;
  qty: number;
  price: number;
  total: number;
  customerId: string;
  customerName: string;
  date: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  saleId: string;
  date: string;
  customer: string;
  items: { product: string; qty: number; price: number; total: number }[];
  total: number;
};

export type Settings = {
  storeName: string;
  address: string;
  phone: string;
  email: string;
};

export const defaultSettings: Settings = {
  storeName: "Nusaybah Hub",
  address: "C/73 Alhaji Ango Street, Jos North",
  phone: "08105257672",
  email: "",
};

export function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 2 }).format(n || 0);
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* Cloud-backed collections (shared across all signed-in staff)        */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const listeners = new Set<() => void>();
function emitAll() {
  listeners.forEach((fn) => fn());
}

function useCollection<T extends { id: string }>(
  table: "products" | "customers" | "sales" | "invoices",
  fromRow: (row: Row) => T,
  toRow: (item: T) => Row,
  orderBy: { column: string; ascending: boolean },
) {
  const [value, setValue] = useState<T[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const previous = useRef<T[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderBy.column, { ascending: orderBy.ascending });
    if (error) {
      console.error(`Failed to load ${table}`, error);
      setHydrated(true);
      return;
    }
    const mapped = (data ?? []).map((row) => fromRow(row as Row));
    previous.current = mapped;
    setValue(mapped);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  useEffect(() => {
    void load();
    const sync = () => void load();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [load]);

  const save = useCallback(
    async (next: T[]) => {
      const before = previous.current;
      // optimistic
      previous.current = next;
      setValue(next);

      const beforeById = new Map(before.map((i) => [i.id, i]));
      const nextIds = new Set(next.map((i) => i.id));

      const removed = before.filter((i) => !nextIds.has(i.id));
      const changed = next.filter((i) => {
        const old = beforeById.get(i.id);
        return !old || JSON.stringify(old) !== JSON.stringify(i);
      });

      try {
        if (removed.length) {
          const { error } = await supabase
            .from(table)
            .delete()
            .in(
              "id",
              removed.map((i) => i.id),
            );
          if (error) throw error;
        }
        if (changed.length) {
          const { error } = await (supabase.from(table) as unknown as {
            upsert: (rows: Row[]) => Promise<{ error: unknown }>;
          }).upsert(changed.map(toRow));
          if (error) throw error;
        }
      } catch (error) {
        console.error(`Failed to save ${table}`, error);
        alert(
          `Could not save changes to ${table}. You may not have permission for this action.`,
        );
      }
      emitAll();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table],
  );

  return { value, save, hydrated } as const;
}

const num = (v: unknown) => Number(v ?? 0);
const str = (v: unknown) => String(v ?? "");

export function useProducts() {
  return useCollection<Product>(
    "products",
    (r) => ({
      id: str(r["id"]),
      name: str(r["name"]),
      category: str(r["category"]),
      price: num(r["price"]),
      qty: num(r["qty"]),
      lowStock: num(r["low_stock"]),
    }),
    (p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      qty: p.qty,
      low_stock: p.lowStock,
    }),
    { column: "created_at", ascending: true },
  );
}

export function useCustomers() {
  return useCollection<Customer>(
    "customers",
    (r) => ({
      id: str(r["id"]),
      name: str(r["name"]),
      phone: str(r["phone"]),
      email: str(r["email"]),
      address: str(r["address"]),
    }),
    (c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address }),
    { column: "created_at", ascending: true },
  );
}

export function useSales() {
  return useCollection<Sale>(
    "sales",
    (r) => ({
      id: str(r["id"]),
      productId: str(r["product_id"]),
      productName: str(r["product_name"]),
      qty: num(r["qty"]),
      price: num(r["price"]),
      total: num(r["total"]),
      customerId: str(r["customer_id"]),
      customerName: str(r["customer_name"]),
      date: str(r["date"]),
    }),
    (s) => ({
      id: s.id,
      product_id: s.productId || null,
      product_name: s.productName,
      qty: s.qty,
      price: s.price,
      total: s.total,
      customer_id: s.customerId || null,
      customer_name: s.customerName,
      date: s.date,
    }),
    { column: "date", ascending: false },
  );
}

export function useInvoices() {
  return useCollection<Invoice>(
    "invoices",
    (r) => ({
      id: str(r["id"]),
      invoiceNumber: str(r["invoice_number"]),
      saleId: str(r["sale_id"]),
      date: str(r["date"]),
      customer: str(r["customer"]),
      items: (r["items"] as Invoice["items"]) ?? [],
      total: num(r["total"]),
    }),
    (i) => ({
      id: i.id,
      invoice_number: i.invoiceNumber,
      sale_id: i.saleId || null,
      date: i.date,
      customer: i.customer,
      items: i.items,
      total: i.total,
    }),
    { column: "date", ascending: false },
  );
}

export function useSettings() {
  const [value, setValue] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("store_settings").select("*").eq("id", true).maybeSingle();
    if (data) {
      setValue({
        storeName: str(data.store_name) || defaultSettings.storeName,
        address: str(data.address),
        phone: str(data.phone),
        email: str(data.email),
      });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    void load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);

  const save = useCallback(async (next: Settings) => {
    setValue(next);
    const { error } = await supabase.from("store_settings").update({
      store_name: next.storeName,
      address: next.address,
      phone: next.phone,
      email: next.email,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    if (error) {
      console.error(error);
      alert("Only an admin can change store settings.");
      void load();
    }
  }, [load]);

  return { value, save, hydrated } as const;
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printHtml(title: string, inner: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<html><head><title>${title}</title><style>
    body{font-family:'Segoe UI',system-ui,sans-serif;padding:24px;color:#212529}
    h2{color:#0a2463;margin:0}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{border-bottom:1px solid #e9ecef;padding:8px;text-align:left;font-size:14px}
    th{background:#0a2463;color:#fff}
    .total{text-align:right;font-weight:700;color:#0a2463;font-size:18px}
    .thankyou{margin-top:20px;text-align:center;color:#d4af37;font-style:italic}
  </style></head><body>${inner}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
