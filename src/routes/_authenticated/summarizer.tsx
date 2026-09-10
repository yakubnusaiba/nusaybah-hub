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
            <div style={{ marginBottom: "0.8rem" }}>
              <label
                style={{
                  background: "#d4af37",
                  color: "#0a2463",
                  padding: "0.5rem 1.2rem",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Upload className="h-4 w-4" /> Upload .txt File
                <input
                  type="file"
                  accept=".txt,text/plain"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>
              <span
                id="fileStatus"
                style={{
                  fontSize: "0.75rem",
                  color: "#6c757d",
                  marginLeft: "0.8rem",
                  fontStyle: "italic",
                }}
              >
                {fileStatus}
              </span>
            </div>

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

        <div ref={resultRef}>
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

          <div
            style={{
              borderLeft: "4px solid #d4af37",
              background: "#fff",
              padding: "1.5rem",
              borderRadius: "12px",
              marginTop: "1.5rem",
              boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            }}
          >
            <h3 style={{ color: "#0a2463", marginBottom: "0.5rem" }}>📜 Summary History</h3>
            <p style={{ color: "#6c757d", marginBottom: "1rem", fontSize: "0.9rem" }}>
              Your previously generated summaries are saved locally in your browser. Click any item
              to reload it instantly.
            </p>
            <div style={{ maxHeight: "300px", overflowY: "auto", marginBottom: "1rem" }}>
              {history.length === 0 ? (
                <p style={{ color: "#6c757d" }}>
                  No summaries saved yet. Generate one to get started!
                </p>
              ) : (
                history.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      background: "#f9f9f9",
                      padding: "0.8rem 1rem",
                      borderRadius: "8px",
                      marginBottom: "0.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderLeft: "3px solid #d4af37",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ flex: 1 }} onClick={() => loadHistory(index)}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "#0a2463",
                        }}
                      >
                        📄 Summary #{history.length - index}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#6c757d",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "400px",
                        }}
                      >
                        {item.snippet || ""}
                      </div>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "#6c757d",
                          marginTop: "0.2rem",
                        }}
                      >
                        {item.date}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistory(index);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#dc3545",
                        cursor: "pointer",
                        padding: "0 0.4rem",
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={clearHistory}
              style={{
                background: "#dc3545",
                color: "white",
                border: "none",
                padding: "0.5rem 1.2rem",
                borderRadius: "50px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <Trash2 className="h-4 w-4" style={{ display: "inline", marginRight: "4px" }} />{" "}
              Clear All History
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
