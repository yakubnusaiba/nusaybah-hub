import { useCallback, useEffect, useState } from "react";

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

const PREFIX = "nusaybah_";

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
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

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function useStored<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const [hydrated, setHydrated] = useState(false);

  const sync = useCallback(() => {
    setValue(read<T>(key, fallback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    sync();
    setHydrated(true);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, [sync]);

  const save = useCallback(
    (next: T) => {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(next));
      emit();
    },
    [key],
  );

  return { value, save, hydrated } as const;
}

export function useProducts() {
  return useStored<Product[]>("products", []);
}
export function useCustomers() {
  return useStored<Customer[]>("customers", []);
}
export function useSales() {
  return useStored<Sale[]>("sales", []);
}
export function useInvoices() {
  return useStored<Invoice[]>("invoices", []);
}
export function useSettings() {
  return useStored<Settings>("settings", defaultSettings);
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
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
