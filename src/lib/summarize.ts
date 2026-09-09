import { z } from "zod";

export const MAX_SUMMARY_INPUT = 30000;
export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export const summaryInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(20, "Please paste a bit more text to summarize.")
    .max(MAX_SUMMARY_INPUT, "Please limit your text to 30,000 characters.")
    .refine((text) => countWords(text) >= 5, "Please paste at least five words to summarize."),
  length: z.enum(["short", "medium", "long"]),
});
export const summaryResultSchema = z.object({
  summary: z.string().trim().min(1),
  keyPoints: z.array(z.string().trim().min(1)).min(1).max(5),
});
export type SummaryLength = z.infer<typeof summaryInputSchema>["length"];
export type SummaryResult = z.infer<typeof summaryResultSchema>;
