import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ClipboardCopy, Download, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell, Card, btnGold, btnOutline, inputClass, labelClass } from "@/components/AppShell";
import { summarizeText, type SummaryLength, type SummaryResult } from "@/lib/summarize.functions";

import { countWords, MAX_SUMMARY_INPUT, summaryInputSchema } from "@/lib/summarize";

type HistoryEntry = {
  id: number;
  date: string;
  summary: string;
  snippet: string;
};

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
        content:
          "Turn long messages, notes or supplier emails into a short summary with key points.",
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

function SummarizerPage() {
  const run = useServerFn(summarizeText);
  const [text, setText] = useState("");
  const [length, setLength] = useState<SummaryLength>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [originalWords, setOriginalWords] = useState(0);
  const [copied, setCopied] = useState(false);
  const [fileStatus, setFileStatus] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const plainText = result
    ? `Summary:\n${result.summary}\n\nKey Points:\n${result.keyPoints.map((p) => `• ${p}`).join("\n")}\n\nOriginal: ${originalWords} words | Summary: ${countWords(result.summary)} words`
    : "";

  function getHistory(): HistoryEntry[] {
    try {
      return JSON.parse(localStorage.getItem("nusaybah_summary_history") || "[]") || [];
    } catch {
      return [];
    }
  }

  function saveHistoryToStorage(newHistory: HistoryEntry[]) {
    localStorage.setItem("nusaybah_summary_history", JSON.stringify(newHistory));
  }

  function saveSummaryToHistory(summaryText: string, originalSnippet: string) {
    const current = getHistory();
    const entry: HistoryEntry = {
      id: Date.now(),
      date: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      summary: summaryText,
      snippet: originalSnippet.substring(0, 120) + (originalSnippet.length > 120 ? "..." : ""),
    };
    current.unshift(entry);
    if (current.length > 50) current.pop();
    saveHistoryToStorage(current);
    setHistory(current);
  }

  function loadHistory(index: number) {
    const item = history[index];
    if (!item) return;
    setResult({ summary: item.summary, keyPoints: [] });
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  function deleteHistory(index: number) {
    if (!confirm("Delete this saved summary?")) return;
    const updated = [...history];
    updated.splice(index, 1);
    saveHistoryToStorage(updated);
    setHistory(updated);
  }

  function clearHistory() {
    if (!confirm("Delete ALL saved summaries?")) return;
    saveHistoryToStorage([]);
    setHistory([]);
    alert("✅ History cleared!");
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const status = document.getElementById("fileStatus");
    if (!file) {
      setFileStatus("");
      return;
    }
    if (file.size > 2000000) {
      alert("⚠️ File is too large (max 2MB).");
      event.target.value = "";
      return;
    }
    setFileStatus("⏳ Loading...");
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target?.result as string;
      setText(content);
      setFileStatus("✅ Loaded: " + file.name);
    };
    reader.onerror = function () {
      setFileStatus("❌ Could not read file.");
    };
    reader.readAsText(file);
  }

  async function onSummarize() {
    if (loading) return;
    setError("");
    setCopied(false);
    const input = summaryInputSchema.safeParse({ text, length });
    if (!input.success) {
      setError(input.error.issues[0]?.message || "Please check your text.");
      return;
    }
    setResult(null);
    setLoading(true);
    try {
      const res = await run({ data: input.data });
      setOriginalWords(countWords(input.data.text));
      setResult(res);
      saveSummaryToHistory(res.summary, input.data.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the summary. Please download it instead.");
    }
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
                maxLength={MAX_SUMMARY_INPUT}
                disabled={loading}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste a message, note, article or supplier email here…"
                className={`${inputClass} resize-y`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {countWords(text)} words · {text.length.toLocaleString()} / 30,000 characters
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <span className={labelClass}>Summary length</span>
                <div className="flex gap-2">
                  {LENGTHS.map((opt) => (
                    <button
                      key={opt.value}
                      disabled={loading}
                      aria-pressed={length === opt.value}
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
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
          </div>
        </Card>

        {result ? (
          <Card>
            <div className="space-y-5 p-5">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
                  Summary
                </h2>
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
                Original: {originalWords} words &nbsp;|&nbsp; Summary: {countWords(result.summary)}{" "}
                words
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
