ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'Cash';

UPDATE public.sales SET amount_paid = total WHERE amount_paid = 0;

CREATE TABLE public.sale_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'Cash',
  note text NOT NULL DEFAULT '',
  date timestamp with time zone NOT NULL DEFAULT now(),
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sale_payments_select" ON public.sale_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "sale_payments_insert" ON public.sale_payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sale_payments_update" ON public.sale_payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sale_payments_delete" ON public.sale_payments FOR DELETE TO authenticated USING (can_delete_records(auth.uid()));

CREATE INDEX IF NOT EXISTS sale_payments_sale_id_idx ON public.sale_payments(sale_id);