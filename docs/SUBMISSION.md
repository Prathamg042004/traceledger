# TraceLedger submission and demonstration

## Project
AI-Powered Structured Data Extraction System for Unstructured Business Inputs.

Team: Pratham Gupta, Raghav Gautam, RS Abhay Thakur, Suray Prakash. Team roles and individual contributions should be confirmed by each member; this document does not invent work attribution.

## Synopsis implementation map
1. Input: PDF, PNG, JPG, WEBP, TXT, MD, EML and pasted message text.
2. Extraction: PDF.js text parsing; Tesseract.js English OCR for images and scanned pages.
3. Processing: Claude through a server-side Anthropic provider; schema-constrained fields and line items; explicit empty values for missing information. A separately labeled deterministic baseline is available.
4. Structuring: editable header fields and line-item table with quantities, unit prices and source amounts.
5. Output: Excel workbook, JSON and CSV. Workbook sheets carry metadata, typed numeric values, items, validation, history and source text.
6. Error detection: required values, types, dates, totals, item arithmetic, source quotes and invoice/order mismatches. Human review gates approval.

### Technology change that must be disclosed
The synopsis proposed Python, Pandas, pdfplumber, pytesseract and OpenAI. This implementation uses Next.js/React, PDF.js, Tesseract.js, ExcelJS and Claude. The functional pipeline is retained; the language/provider choice differs. Explain this choice to the guide and obtain acceptance rather than claiming the original stack was implemented. JavaScript permits browser-local OCR and a single Vercel deployment. Claude uses the team's available API credits.

## Six-minute demonstration
1. Open the production URL and identify the chosen extraction engine.
2. Import fixtures/receipt-image.png as Receipt. Show OCR progress and recognized text. Explain that evidence links refer to recognized text, which may contain OCR errors.
3. Extract it. Show seven receipt fields and the Notebook item. Show a calculated amount separately from the stated amount.
4. Export Excel and inspect all six worksheets. Amounts are numeric, not just formatted strings.
5. Extract the Northstar invoice and purchase order. Show the INR 2,000 discrepancy. Correct the invoice only in the editable record, review every field and item, then approve.
6. Use Live AI on a narrative message and show the actual model identity. Do not present the baseline as AI.
7. Run Evaluation lab and export measured results. Discuss at least one failure and the dataset limitations.

## Reproducible checks
Run npm ci, npm test and npm run build using Node 24. The test suite covers abstention, evidence, date/amount validation, reconciliation, spreadsheet escaping, whitespace rejection, receipts, item arithmetic and Excel roundtrip contents. Browser ingestion must also be checked because Node tests do not prove browser OCR or PDF rendering.

The public evaluation set contains 20 synthetic documents and 143 labeled header fields across invoices, receipts, purchase orders and emails/messages. Baseline result: 113/143 (79.0%). This includes correct abstentions; it is neither OCR accuracy nor live AI accuracy. It is a public regression dataset, not a held-out independent experiment. Line-item and OCR behavior have separate functional fixtures, not a statistical accuracy claim.

## Constraints and interpretation
- Text input is limited to 40,000 characters. Files are limited to 3 MB and PDFs to 20 pages, with at most five OCR pages.
- English printed-text OCR is supported. Handwriting, rotated photographs, languages other than English and complex layouts need further evaluation.
- PDF OCR fallback uses a text-length heuristic; a scan with a substantial existing but incorrect text layer can need external correction.
- Review history is browser-local and not tamper-proof. The access code protects a controlled demo, not a multi-user enterprise deployment.
- Image/PDF originals are not durably stored; keep the original files for comparison. Source quotes prove exact text presence, not semantic correctness.
- Item arithmetic assumes no additional discount or shipping structure. Model omissions still require human review.
- Actual AI usage consumes provider credits. A 20-case comparison makes 20 calls. Never commit keys.

## Viva preparation
Be ready to explain OCR versus semantic extraction, why schema validity is insufficient, how exact-match scoring treats missing fields, why arithmetic errors are preserved on extraction, and why a local history is not an immutable audit log. Demonstrate a schema change personally and explain each core module. Disclose AI-assisted development according to college rules. No model training or guaranteed grade is claimed.

## Next research steps
Freeze a larger independently labeled dataset; separate development and held-out evaluation. Measure field and item exact match, populated-field precision/recall, unsupported-value rate, OCR character error rate, latency, token usage and human correction time. Compare baseline, model-only and model-plus-review workflows. Report failures rather than replacing them with polished examples.
