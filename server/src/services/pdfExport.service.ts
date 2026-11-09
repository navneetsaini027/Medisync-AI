export interface ReportSummaryPdfContent {
  language: string;
  generatedAt: string;
  summary: string;
  insights?: string;
  recommendations: string[];
}

interface ReportSummaryPdfInput {
  language: string;
  summary?: string;
  insights?: string;
  recommendations?: string[];
}

const languageCodes: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Marathi: "mr",
  Gujarati: "gu",
  Bengali: "bn",
  Tamil: "ta",
  Telugu: "te",
  Kannada: "kn",
  Malayalam: "ml",
  Punjabi: "pa",
  Urdu: "ur",
  Odia: "or",
  Assamese: "as",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(markdown: string): string {
  return escapeHtml(markdown)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

function renderMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br />")}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = null;
  };

  const openList = (type: "ul" | "ol") => {
    if (listType === type) return;
    closeList();
    flushParagraph();
    html.push(`<${type}>`);
    listType = type;
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      flushParagraph();
      return;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      closeList();
      flushParagraph();
      html.push("<hr />");
      return;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      flushParagraph();
      const headingLevel = Math.min(Number(headingMatch[1].length) + 1, 6);
      html.push(`<h${headingLevel}>${renderInlineMarkdown(headingMatch[2])}</h${headingLevel}>`);
      return;
    }

    const unorderedMatch = line.match(/^[-*•]\s+(.+)$/);
    if (unorderedMatch) {
      openList("ul");
      html.push(`<li>${renderInlineMarkdown(unorderedMatch[1])}</li>`);
      return;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      openList("ol");
      html.push(`<li>${renderInlineMarkdown(orderedMatch[1])}</li>`);
      return;
    }

    closeList();
    paragraph.push(line);
  });

  closeList();
  flushParagraph();

  return html.join("");
}

export function ingestReportSummaryContent(input: ReportSummaryPdfInput): ReportSummaryPdfContent {
  return {
    language: input.language,
    generatedAt: new Date().toLocaleString(),
    summary: input.summary?.trim() || "",
    insights: input.insights?.trim(),
    recommendations: (input.recommendations || [])
      .map((recommendation) => recommendation.trim())
      .filter(Boolean),
  };
}

export function buildReportSummaryPdfHtml(content: ReportSummaryPdfContent): string {
  const lang = languageCodes[content.language] || "en";

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Medisync AI Report Summary</title>
    <style>
      @page {
        size: A4;
        margin: 18mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #2C1A0E;
        background: #FFFAF8;
        font-family: Inter, "Noto Sans Devanagari", "Nirmala UI", "Kohinoor Devanagari", "Mangal", "Arial Unicode MS", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        line-height: 1.7;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      header {
        border-bottom: 2px solid #D85A30;
        padding-bottom: 18px;
        margin-bottom: 22px;
      }

      .brand {
        color: #D85A30;
        font-weight: 800;
        font-size: 13px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 28px;
        line-height: 1.2;
      }

      .meta {
        color: #993C1D;
        font-size: 12px;
      }

      h2,
      h3,
      h4,
      h5,
      h6 {
        color: #712B13;
        margin: 18px 0 8px;
        line-height: 1.3;
      }

      h2 {
        font-size: 19px;
      }

      h3,
      h4,
      h5,
      h6 {
        font-size: 16px;
      }

      hr {
        border: 0;
        border-top: 1px solid #F5C4B3;
        margin: 16px 0;
      }

      p {
        margin: 0 0 10px;
      }

      ul,
      ol {
        margin: 8px 0 12px;
        padding-left: 22px;
      }

      li {
        margin-bottom: 6px;
      }

      strong {
        color: #2C1A0E;
      }

      .summary {
        break-inside: auto;
      }

      .insights {
        border-left: 4px solid #D85A30;
        background: #FAECE7;
        padding: 12px 14px;
        margin-top: 18px;
      }

      .recommendation {
        display: grid;
        grid-template-columns: 30px 1fr;
        gap: 12px;
        border: 1px solid #F5C4B3;
        border-radius: 8px;
        padding: 12px;
        margin: 10px 0;
        break-inside: avoid;
      }

      .number {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: #FAECE7;
        color: #993C1D;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
      }

      .disclaimer {
        border-top: 1px solid #F5C4B3;
        color: #712B13;
        font-size: 11px;
        padding-top: 14px;
        margin-top: 24px;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="brand">Medisync AI</div>
        <h1>Report Summary</h1>
        <div class="meta">Language: ${escapeHtml(content.language)} | Generated: ${escapeHtml(content.generatedAt)}</div>
      </header>

      <section class="summary">
        <h2>Report Summary</h2>
        ${renderMarkdown(content.summary)}
      </section>

      ${
        content.insights || content.recommendations.length > 0
          ? `<section>
              <h2>Personalized Insights</h2>
              ${content.insights ? `<div class="insights">${renderMarkdown(content.insights)}</div>` : ""}
              ${content.recommendations
                .map(
                  (recommendation, index) => `<article class="recommendation">
                    <div class="number">${index + 1}</div>
                    <div>${renderMarkdown(recommendation)}</div>
                  </article>`
                )
                .join("")}
            </section>`
          : ""
      }

      <p class="disclaimer">
        This AI-generated content is for informational purposes only and is not a medical diagnosis or professional medical advice.
        Always consult a qualified healthcare provider.
      </p>
    </main>
  </body>
</html>`;
}
