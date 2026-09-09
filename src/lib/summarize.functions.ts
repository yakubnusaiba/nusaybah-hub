// ============================================================
// SMART TEXT SUMMARIZER (No API Key Needed)
// ============================================================

export type SummaryLength = "short" | "medium" | "long";

export type SummaryResult = {
  summary: string;
  originalWordCount: number;
  summaryWordCount: number;
  keyPoints: string[];
  reductionPercentage: number;
};

export function summarizeText(
  text: string,
  length: SummaryLength = "medium"
): SummaryResult {
  if (!text || text.trim().length === 0) {
    return {
      summary: "",
      originalWordCount: 0,
      summaryWordCount: 0,
      keyPoints: [],
      reductionPercentage: 0,
    };
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const originalWordCount = text.split(/\s+/).length;

  let maxSentences = 5;
  if (length === "short") maxSentences = 3;
  else if (length === "medium") maxSentences = 5;
  else if (length === "long") maxSentences = 8;

  if (sentences.length <= maxSentences) {
    const summary = text;
    const summaryWordCount = summary.split(/\s+/).length;
    const keyPoints = extractKeyPoints(text);
    return {
      summary,
      originalWordCount,
      summaryWordCount,
      keyPoints,
      reductionPercentage: Math.round(
        ((originalWordCount - summaryWordCount) / originalWordCount) * 100
      ),
    };
  }

  const scoredSentences = sentences.map((sentence, index) => {
    const clean = sentence.trim();
    const words = clean.split(/\s+/);
    const wordCount = words.length;

    // Position score (first sentences are more important)
    const positionScore = 1 - index / sentences.length;

    // Keyword score
    const keywords = [
      "important",
      "significant",
      "key",
      "main",
      "primary",
      "essential",
      "critical",
      "major",
      "fundamental",
      "central",
      "conclusion",
      "therefore",
      "thus",
      "hence",
      "consequently",
    ];
    let keywordScore = 0;
    keywords.forEach((keyword) => {
      if (clean.toLowerCase().includes(keyword)) {
        keywordScore += 1;
      }
    });
    // Normalize keyword score
    keywordScore = Math.min(keywordScore / 3, 1);

    // Length score (longer sentences tend to have more information)
    const lengthScore = Math.min(wordCount / 20, 1);

    const totalScore = positionScore * 0.5 + keywordScore * 0.3 + lengthScore * 0.2;

    return {
      sentence: clean,
      score: totalScore,
      wordCount,
      originalIndex: index,
    };
  });

  scoredSentences.sort((a, b) => b.score - a.score);
  const selected = scoredSentences.slice(0, maxSentences);
  selected.sort((a, b) => a.originalIndex - b.originalIndex);

  const summary = selected.map((s) => s.sentence).join(" ");
  const summaryWordCount = summary.split(/\s+/).length;
  const keyPoints = extractKeyPoints(text);

  return {
    summary,
    originalWordCount,
    summaryWordCount,
    keyPoints,
    reductionPercentage: Math.round(
      ((originalWordCount - summaryWordCount) / originalWordCount) * 100
    ),
  };
}

function extractKeyPoints(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const numPoints = Math.min(3, sentences.length);
  const points: string[] = [];
  for (let i = 0; i < numPoints; i++) {
    const sentence = sentences[i].trim();
    const clean = sentence.replace(/^["']|["']$/g, "").trim();
    points.push(clean.length > 100 ? clean.slice(0, 100) + "..." : clean);
  }
  return points;
}
