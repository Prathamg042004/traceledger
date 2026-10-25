# Synopsis coverage and implementation notes

The uploaded synopsis is “AI-Powered Structured Data Extraction System for Unstructured Business Inputs”. This checklist distinguishes implemented capabilities from proposed technology and future work.

| Synopsis module | Implementation | Verification |
| --- | --- | --- |
| PDF, image and text upload | PDF.js text extraction, Tesseract.js English OCR, TXT/MD/EML and pasted text; up to ten files per upload | Ingestion code reviewed; OCR needs browser runtime and downloadable engine |
| OCR and PDF parsing | Text PDFs plus OCR fallback for scanned pages | Existing receipt image and PDF fixtures available for manual demonstration |
| Clean and identify fields | Deterministic label parser or configured live model with schema-constrained results | Parser and API validation tests |
| Structured JSON and tables | Editable fields, line-item table, JSON view and export | Existing field, item and arithmetic tests |
| Excel output | Styled six-sheet Excel workbook with numeric cells, source and history | ExcelJS roundtrip test |
| Missing/incorrect fields | Required-field, date, numeric, arithmetic and evidence checks | Engine tests plus quality-desk tests |

## New capabilities in this revision

- Project showcase with pipeline, architecture, capabilities and honest limitations.
- Document quality desk: filter records, inspect errors, review three independent checklist metrics and export a JSON quality report.
- Batch upload: sequential processing of up to ten files, per-file errors, duplicate source-text detection and a 100-document workspace cap on batch input.
- Responsive showcase and additional navigation entries.

## Demonstration

1. Open Project showcase to explain the six modules.
2. Open Intelligence overview and process the pending synthetic samples offline.
3. Open Document quality: the sample invoice is blocked because its stated total fails arithmetic validation.
4. Inspect the record; click a source-linked field, correct the total only after checking the source, and review every field and item before approval.
5. Use Cross-document checks to compare the shared purchase-order reference.
6. Export Excel and the quality report; use Evaluation lab for reproducible synthetic fixture scores.
7. Upload multiple files to demonstrate partial success and duplicate detection.

## Technology difference from synopsis

The current application uses React/Next.js and JavaScript, PDF.js, Tesseract.js and ExcelJS. The synopsis proposes Python, pandas, pdfplumber, pytesseract and OpenAI API. Feature coverage does not imply implementation of that exact stack. The live endpoint currently uses the configured Anthropic model or AI Gateway. Update the academic documentation to the actual implementation, or implement a separate Python service if the department requires that exact stack.

## Remaining limitations

The local workbench works independently; optional authenticated cloud collaboration is implemented but requires project configuration and hosted acceptance testing (CLOUD-SETUP.md). English OCR only, with first-use engine downloads. Image OCR and live model calls require runtime verification; compilation and unit tests do not prove OCR accuracy. Quality metrics measure checklist coverage, not correctness or calibrated model confidence. Synthetic benchmarks are not a production accuracy estimate.
