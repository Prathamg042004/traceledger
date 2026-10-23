# TraceLedger

**AI-Powered Structured Data Extraction System for Unstructured Business Inputs**

[Quick start](#quick-start) · [Architecture](#architecture) · [Demo guide](#five-minute-demo) · [Evaluation](#evaluation-methodology) · [Project guide](docs/PROJECT_GUIDE.md)

TraceLedger turns business documents into reviewable structured records. Its distinguishing feature is a complete evidence-and-review workflow: preserve the original text, link extracted fields to exact source quotes, validate business rules, reconcile related documents, and record human corrections before approval.

Built as a final-year project by Pratham Gupta with AI-assisted development. The application does not claim a newly trained model or production-grade accuracy.

## Features

- Import PDFs, PNG/JPG/WEBP images, TXT, MD, EML or pasted text. English OCR runs in the browser for images and PDF pages without usable text (3 MB; 20 PDF pages; up to 5 scanned pages per file).
- Invoice, receipt, purchase-order and business-email schemas, with an editable typed schema contract.
- Live semantic extraction through the Vercel AI SDK and direct Anthropic API, with AI Gateway as an optional alternative.
- Separately labeled offline deterministic parser for demos and baseline comparisons.
- Exact source-quote verification and field-by-field human review.
- Required-field, date, email, amount and arithmetic validation.
- Invoice-to-purchase-order reconciliation by shared order reference.
- Editable line-item tables with quantity, unit price, stated amount, evidence and human review.
- Excel (.xlsx) workbooks containing Document, Fields, Line items, Validation, Review history and Source text sheets. JSON and spreadsheet-safe CSV exports include document status.
- Browser-local review history and opt-in local persistence.
- Twenty inspectable synthetic fixtures and an evaluation UI that measures normalized exact match.
- Responsive workspace UI and a deployment build that runs core logic tests first.

## Quick start

Use Node.js 22 or 24 and npm:

```sh
npm install
npm run dev
```

Visit http://localhost:3000. The offline baseline needs no account or API key.

```sh
npm test
npm run build
npm start
```

## Live AI setup

1. Set ANTHROPIC_API_KEY privately in Vercel Production environment variables. This uses your Anthropic credits directly.
2. Set APP_ACCESS_CODE to a strong private demo password.
3. The default Anthropic model is claude-haiku-5-5. Override it using ANTHROPIC_MODEL when needed.
4. Redeploy. In Project settings, enter the demo password, then select Live AI.
5. Alternatively configure AI_GATEWAY_API_KEY (or Gateway-enabled Vercel OIDC) and AI_MODEL. Anthropic takes priority when its key is present.

Never commit credentials. `.env.example` contains names only. Do not put server secrets in `NEXT_PUBLIC_*` variables. Live calls require model credits and are not automatically replaced with offline results on error.

The shared access code is suitable for a controlled student demo, not public multi-tenant authorization. Before opening live extraction broadly, add user authentication, durable per-user rate limits and quotas. Gateway billing limits should be set in the provider dashboard.

## Deploy to Vercel

Import this GitHub repository as a Next.js project. Build command: `npm run build`. No separate database is needed for the current browser-local version. Add the environment variables above only when enabling live AI.

## Architecture

```mermaid
flowchart LR
  A[PDF / text / email] --> B[Client text ingestion]
  B --> C{Engine selection}
  C --> D[Offline label parser]
  C --> E[Access-controlled Next.js API]
  E --> F[Anthropic API / AI Gateway]
  F --> G[Schema-validated field output]
  D --> H[Exact evidence checks]
  G --> H
  H --> I[Business validation]
  I --> J[Human review and edits]
  J --> K[Approval]
  K --> L[Excel / JSON / CSV]
  I --> M[Invoice / PO reconciliation]
```

Core modules:

| Path | Responsibility |
| --- | --- |
| `app/page.js` | Workspace, review, import, schemas, evaluation and history UI |
| `app/api/extract/route.js` | Authentication, request validation and structured AI generation |
| `lib/engine.mjs` | Offline parser, normalization, validation, evidence checks and reconciliation |
| `lib/benchmark.mjs` | Public synthetic fixtures and exact-match scoring |
| `tests/engine.test.mjs` | Core behavioral regression tests |

## Five-minute demo

1. Open the sample invoice. Select **Extract document** in Offline baseline mode.
2. Show that the invoice states 86,960 but 72,000 + 12,960 = 84,960. The app preserves the original error.
3. Click **Source linked** for Total and show the supporting source text.
4. Extract the purchase order and open **Cross-document checks**. Vendor and currency match; total conflicts by 2,000.
5. Correct the invoice total to `84960`, review every field and line item, and approve. Explain that this is a human correction, not a modification of the source document.
6. Export JSON and show the original evidence, reviewed value, validation outcome and review history.
7. Run the baseline evaluation. Explain its failures on prose. If live AI is configured, run the model comparison and report the measured results.

Use synthetic documents in public demos. Sample company names, emails and financial values are fictional.

## Evaluation methodology

The evaluation lab reports normalized field exact match across 20 synthetic fixtures and 143 labeled fields. Empty expected values count as correct abstentions. It does not report F1, calibrated confidence, or production accuracy. Source-quote existence is checked separately and does not prove that a value is correct.

For a defensible dissertation experiment, add a held-out dataset of at least 100–200 de-identified or synthetic documents across multiple layouts. Keep development and test documents separate. Compare baseline, AI-only extraction, and AI plus verification. Report exact match, missing-field precision/recall, unsupported-value rate, latency and per-document cost, with category-level results and failure examples. Do not replace these measurements with the small included smoke-test score.

## Data handling and current limitations

- Offline parsing is browser-local. Live extraction sends text to the configured model provider through a server-side route, using direct Anthropic access or the optional Vercel AI Gateway.
- No shared database or login is implemented. Persistence is opt-in localStorage on the current device; disabled by default.
- Browser-local history is not tamper-proof and must not be described as a compliance audit trail.
- English OCR uses Tesseract.js. First use downloads worker/model assets from public CDNs. Image pixels are processed locally. Handwriting, rotation, blur and complex layouts can fail; compare ingested text against the original file.
- PDF extraction depends on the text layer and may reorder table content.
- Line-item extraction is implemented. The baseline only recognizes explicit table/quantity formats; varied layouts need Live AI. Item sums assume no discounts or additional charges and require human review.
- Evidence matching verifies a verbatim quote, not semantic entailment or calibrated confidence.
- Schemas are session-local and can be exported as JSON.
- The baseline relies on explicit labels and will miss prose and unfamiliar layouts.
- Approvals reflect one local reviewer and do not establish document authenticity.

## Technical references

- [AI SDK structured output](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [Vercel AI Gateway authentication](https://vercel.com/docs/ai-gateway/authentication-and-byok)
- [PDF.js](https://mozilla.github.io/pdf.js/)
- [Next.js documentation](https://nextjs.org/docs)

See `docs/PROJECT_GUIDE.md` for the academic narrative and viva preparation.
