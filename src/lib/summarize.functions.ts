import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { summaryInputSchema } from "./summarize";
export type { SummaryLength, SummaryResult } from "./summarize";

export const summarizeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => summaryInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { generateSummary } = await import("./summarize.server");
    return generateSummary(data);
  });
