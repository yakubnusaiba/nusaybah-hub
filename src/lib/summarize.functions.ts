import { createServerFn } from "@tanstack/react-start";

export type SummaryLength = "short" | "medium" | "long";

export type SummaryResult = {
  summary: string;
  keyPoints: string[];
};

const LENGTH_GUIDE: Record<SummaryLength, string> = {
  short: "1-2 sentences",
  medium: "3-5 sentences",
  long: "5-8 sentences",
};

export const summarizeText = createServerFn({ method: "POST" })
  .inputValidator((input: { text: string; length: SummaryLength }) => {
    const text = typeof input?.text === "string" ? input.text.trim() : "";
    if (text.length < 20) throw new Error("Please enter at least a couple of sentences to summarize.");
    if (text.length > 30000) throw new Error("That text is too long. Please shorten it a little.");
    const length: SummaryLength =
      input.length === "short" || input.length === "medium" || input.length === "long"
        ? input.length
        : "medium";
    return { text, length };
  })
  .handler(async ({ data }): Promise<SummaryResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("The AI service is not configured yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "You summarize text accurately and never invent facts. Reply with JSON only, no markdown fences.",
          },
          {
            role: "user",
            content: `Summarize the text below in ${LENGTH_GUIDE[data.length]}, then list 3 to 5 short key points.\n\nReturn JSON shaped exactly like {"summary": "...", "keyPoints": ["...", "..."]}.\n\nTEXT:\n${data.text}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) throw new Error("The summarizer is busy right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("The AI credits for this workspace have run out.");
    if (!res.ok) throw new Error(`Summarizing failed (${res.status}). Please try again.`);

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = payload.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: { summary?: unknown; keyPoints?: unknown } = {};
    try {
      parsed = JSON.parse(cleaned) as typeof parsed;
    } catch {
      return { summary: cleaned || "No summary was produced. Please try again.", keyPoints: [] };
    }

    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : [];

    if (!summary) throw new Error("No summary was produced. Please try again.");
    return { summary, keyPoints };
  });
