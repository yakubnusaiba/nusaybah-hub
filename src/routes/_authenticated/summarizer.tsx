import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ClipboardCopy, Download, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { AppShell, Card, btnGold, btnOutline, inputClass, labelClass } from "@/components/AppShell";
import { summarizeText, type SummaryLength, type SummaryResult } from "@/lib/summarize.functions";

export const Route = createFileRoute("/_authenticated/summarizer")({
  head: () => ({
    meta: [
      { title: "AI Text Summarizer — Nusaybah Hub Business Manager" },
      {
        name: "description",
        content:
          "Paste any text and get an AI summary with key points, word counts, copy and download options.",
      },
      { property: "og:title", content: "AI Text Summarizer — Nusaybah Hub" },
      {
        property: "og:description",
        content: "Turn long messages, notes or supplier emails into a short summary with key points.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SummarizerPage,
});

const LENGTHS: { value: SummaryLength; label: string; hint: string }[] = [
  { value: "short", label: "Short", hint: "1–2 sentences" },
  { value: "medium", label: "Medium", hint: "3–5 sentences" },
  { value: "long", label: "Long", hint: "5–8 sentences" },
];

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

function SummarizerPage() {
  const run = useServerFn(summarizeText);
  const [text, setText] = useState("");
  const [length, setLength] = useState<SummaryLength>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);

  const plainText = result
    ? `Summary:\n${result.summary}\n\nKey Points:\n${result.keyPoints.map((p) => `• ${p}`).join("\n")}\n\nOriginal: ${countWords(text)} words | Summary: ${countWords(result.summary)} words`
    : "";

  async function onSummarize() {
    setError("");
    setResult(null);
    if (countWords(text) < 5) {
      setError("Please paste a bit more text to summarize.");
      return;
    }
    setLoading(true);
    try {
      const res = await run({ data: { text, length } });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    await navigator.clipboard.writeText(plainText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function onDownload() {
    const blob = new Blob([plainText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="AI Text Summarizer">
      <div className="mx-auto max-w-3xl space-y-5">
        <Card>
          <div className="space-y-4 p-5">
            <div>
              <label className={labelClass} htmlFor="summarizerInput">
                Text to summarize
              </label>
              <textarea
                id="summarizerInput"
                rows={10}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste a message, note, article or supplier email here…"
                className={`${inputClass} resize-y`}
              />
              <p className="mt-1 text-xs text-muted-foreground">{countWords(text)} words</p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <span className={labelClass}>Summary length</span>
                <div className="flex gap-2">
                  {LENGTHS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLength(opt.value)}
                      className={
                        length === opt.value
                          ? `${btnGold} px-3 py-2 text-sm`
                          : `${btnOutline} px-3 py-2 text-sm`
                      }
                      title={opt.hint}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={onSummarize}
                disabled={loading}
                className={`${btnGold} ml-auto disabled:opacity-60`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Summarizing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Summarize
                  </>
                )}
              </button>
            </div>

            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            ) : null}
          </div>
        </Card>

        {result ? (
          <Card>
            <div className="space-y-5 p-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">Summary</h2>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{result.summary}</p>
              </div>

              {result.keyPoints.length > 0 ? (
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                    Key points
                  </h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-relaxed">
                    {result.keyPoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Original: {countWords(text)} words &nbsp;|&nbsp; Summary: {countWords(result.summary)} words
              </p>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onCopy} className={btnOutline}>
                  {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy summary"}
                </button>
                <button type="button" onClick={onDownload} className={btnOutline}>
                  <Download className="h-4 w-4" /> Download .txt
                </button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
