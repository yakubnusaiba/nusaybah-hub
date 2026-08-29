import { createFileRoute } from "@tanstack/react-router";
import { Eye, FilePlus2, ImageDown, Printer, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { useAuth } from "@/lib/auth";
import {
  AppShell,
  Card,
  EmptyState,
  Modal,
  btnGold,
  btnOutline,
  btnPrimary,
  btnDanger,
} from "@/components/AppShell";
import {
  formatCurrency,
  formatDate,
  generateId,
  printHtml,
  downloadNodeAsImage,
  useInvoices,
  useSales,
  useSettings,
  type Invoice,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Nusaybah Hub Business Manager" },
      {
        name: "description",
        content: "Generate, preview and print professional invoices from your recorded sales.",
      },
      { property: "og:title", content: "Invoices — Nusaybah Hub" },
      {
        property: "og:description",
        content: "Professional branded invoices generated from your sales records.",
      },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { value: invoices, save } = useInvoices();
  const { canDelete } = useAuth();

  const { value: sales } = useSales();
  const { value: settings } = useSettings();
  const [viewing, setViewing] = useState<Invoice | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generate = () => {
    const lastSale = sales[sales.length - 1];
    if (!lastSale) {
      alert("No sales records to generate an invoice from.");
      return;
    }
    const invoice: Invoice = {
      id: generateId(),
      saleId: lastSale.id,
      invoiceNumber: "INV-" + String(invoices.length + 1).padStart(4, "0"),
      date: new Date().toISOString(),
      customer: lastSale.customerName,
      items: [
        {
          product: lastSale.productName,
          qty: lastSale.qty,
          price: lastSale.price,
          total: lastSale.total,
        },
      ],
      total: lastSale.total,
    };
    save([...invoices, invoice]);
    setViewing(invoice);
  };

  return (
    <AppShell title="Invoices">
      <Card
        title="Invoices"
        actions={
          <button className={btnPrimary} onClick={generate}>
            <FilePlus2 className="h-4 w-4" /> Generate from Last Sale
          </button>
        }
      >
        {invoices.length === 0 ? (
          <EmptyState message="No invoices yet." />
        ) : (
          <div className="space-y-3">
            {invoices
              .slice()
              .reverse()
              .map((inv) => (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border border-l-4 border-l-gold bg-background p-3"
                >
                  <div className="text-sm">
                    <strong className="text-primary">{inv.invoiceNumber}</strong>
                    <span className="text-muted-foreground"> · {formatDate(inv.date)}</span>
                    <p className="text-muted-foreground">Customer: {inv.customer}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gold">₦{formatCurrency(inv.total)}</span>
                    <button
                      className={btnOutline}
                      aria-label="View"
                      onClick={() => setViewing(inv)}
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button
                        className={btnDanger}
                        aria-label="Delete"
                        onClick={() => {
                          if (confirm("Delete this invoice?"))
                            save(invoices.filter((i) => i.id !== inv.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Invoice Preview" wide>
        {viewing && (
          <div className="space-y-4">
            <div ref={invoiceRef} className="rounded-lg border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h4 className="text-lg font-bold text-primary">{settings.storeName}</h4>
                  <p className="text-xs text-muted-foreground">{settings.address}</p>
                  <p className="text-xs text-muted-foreground">📞 {settings.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold tracking-widest text-gold">INVOICE</p>
                  <p className="font-semibold">{viewing.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(viewing.date)}</p>
                </div>
              </div>
              <p className="py-3">
                <strong>Customer:</strong> {viewing.customer}
              </p>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit Price</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewing.items.map((item, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-3 py-2">{item.product}</td>
                      <td className="px-3 py-2">{item.qty}</td>
                      <td className="px-3 py-2">₦{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2">₦{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-right text-base font-bold text-primary">
                Total: ₦{formatCurrency(viewing.total)}
              </p>
              <p className="mt-3 text-center text-xs italic text-gold">
                Thank you for patronizing with us — it means the world to serve you
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                className={btnGold}
                onClick={() =>
                  printHtml(
                    viewing.invoiceNumber,
                    `<h2>${settings.storeName}</h2><p>${settings.address}<br/>${settings.phone}</p>
                     <p><strong>${viewing.invoiceNumber}</strong> · ${formatDate(viewing.date)}<br/>Customer: ${viewing.customer}</p>
                     <table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
                     ${viewing.items
                       .map(
                         (i) =>
                           `<tr><td>${i.product}</td><td>${i.qty}</td><td>₦${formatCurrency(i.price)}</td><td>₦${formatCurrency(i.total)}</td></tr>`,
                       )
                       .join("")}
                     </tbody></table>
                     <p class="total">Total: ₦${formatCurrency(viewing.total)}</p>
                     <p class="thankyou">Thank you for patronizing with us!</p>`,
                  )
                }
              >
                <Printer className="h-4 w-4" /> Print / Save PDF
              </button>
              <button
                className={btnOutline}
                onClick={() => {
                  if (invoiceRef.current)
                    void downloadNodeAsImage(invoiceRef.current, viewing.invoiceNumber);
                }}
              >
                <ImageDown className="h-4 w-4" /> Download Image
              </button>
              <button className={btnOutline} onClick={() => setViewing(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
