# Project and viva guide

## Problem statement

Business information arrives as invoices, purchase orders and emails whose layouts vary. Manual entry is slow, while automatic extraction alone can introduce unsupported values or overlook inconsistent amounts. The project investigates an evidence-first workflow in which extraction, validation and human approval are separate steps.

## Abstract

TraceLedger is a web application for converting unstructured business text into schema-constrained records. It combines a language-model extraction interface with exact source-evidence checks, deterministic business validation and field-level human review. The system accepts PDF, image and text inputs with English OCR, supports editable extraction schemas, compares related procurement documents, and exports reviewed results. A deterministic label parser provides an offline baseline, while a reproducible evaluation harness compares it with live model extraction on inspectable synthetic fixtures. The implementation emphasizes traceability and explicit uncertainty: missing fields remain empty, source discrepancies are preserved, and unsupported values require review. Its current scope is a single-reviewer browser-local prototype; production authentication, durable multi-user storage, multilingual OCR and confidence calibration remain extensions.

## Research question

How can source evidence and deterministic validation make language-model extraction more reviewable and expose errors that schema-valid JSON alone does not catch?

## Defensible contribution

The contribution is the integration and evaluation of a reviewable workflow, not the invention of document extraction or training a foundation model. Do not call the project globally unique without a literature review. Differentiate it from a simple upload-and-JSON demo through exact evidence tracing, arithmetic anomaly detection, cross-document reconciliation, explicit abstention, human correction and baseline comparison.

## Objectives and acceptance criteria

| Objective | Demonstration |
| --- | --- |
| Structured extraction | Input produces requested typed fields; absent values remain empty |
| Evidence tracing | Clicking a supported field identifies its verbatim source quote |
| Validation | Wrong totals, invalid dates and missing required values are flagged |
| Reconciliation | Related invoice/PO values are compared by shared reference |
| Human review | Approval requires all fields reviewed and blocking errors resolved |
| Reproducibility | Fixtures, expected values and scoring are visible and exportable |
| Deployment | Source is on GitHub and a tested build is available on Vercel |

## What the examiner should see

Use the included Northstar procurement pack. The invoice total intentionally differs from subtotal plus tax and from the purchase order by INR 2,000. Show the source, extracted value, validation error, related-document conflict, correction, review of fields and items, and Excel export in that order. Explain the distinction between extraction accuracy and business correctness: accurately reading a wrong total is still correct extraction.

## Evaluation plan beyond the prototype

Prepare a frozen held-out test set with ground truth checked by two people where possible. Include clean labels, narrative emails, varied PDF layouts, absent fields, currency formatting, misleading instructions and arithmetic inconsistencies. Separate development samples from the final evaluation. Do not tune prompts on the held-out set.

Compare:

1. Label-based parsing.
2. Schema-constrained LLM extraction.
3. LLM extraction plus evidence/rule checks and human review.

Report field exact match by document category; precision and recall for populated fields; correct-abstention rate; unsupported-value rate; validation anomaly precision/recall; latency; model cost; and reviewer correction count. Record the model ID, prompt version, date and fixture version. Discuss failures instead of hiding them.

The included twenty-fixture evaluation is only a functional smoke test. No live AI score should be claimed until actually run with a configured provider.

## Suggested report structure

1. Introduction, business context and problem statement.
2. Literature review: OCR, rule-based information extraction, schema-constrained LLM output and human-in-the-loop review.
3. Requirements and use cases.
4. Architecture, data flow and data contracts.
5. Implementation and validation algorithms.
6. Experimental methodology and measured results.
7. Error analysis, limitations, privacy and security.
8. Conclusion and future work.

## Viva questions and grounded answers

**Why not just ask a model for JSON?** JSON validity only guarantees structure. The application separately verifies source quotes, checks required fields and business arithmetic, and requires review before approval.

**Is the evidence score a confidence probability?** No. It is a count of fields with verbatim source evidence. It does not estimate the probability of correctness.

**What happens when the model invents evidence?** The exact quote check fails and the field is flagged for review. A copied quote could still be semantically irrelevant, so human review remains necessary.

**Why keep an incorrect total?** Extraction should represent the source faithfully. The validation layer identifies the inconsistency; a human can correct the record while preserving the source.

**Did you train the model?** No. The application uses a hosted foundation model through an API. The implemented work is ingestion, schemas, orchestration, verification, review, reconciliation and evaluation.

**What is unique?** The particular evidence-first procurement workflow and its measured evaluation distinguish this implementation from basic extraction demos. Similar ideas exist in industry; do not claim worldwide novelty.

**Where is data stored?** In memory by default, optionally in browser localStorage. Live inference sends text to the model provider. There is no production database in this version.

**Does it process scanned PDFs?** Yes. PDF pages with fewer than 20 text characters are rendered to a canvas and recognized using Tesseract.js. Up to five scanned pages are accepted per file. English OCR is fallible and must be checked against the original.

**Is the audit log immutable?** No. It is a local review history. A production system would use authenticated users, server-side append-only records and appropriate integrity controls.

**What is the time complexity of the baseline?** It scans document lines against each schema field, approximately O(F × L), where F is the number of fields and L is the number of lines. Reconciliation currently searches local records; indexed server-side matching would be appropriate at scale.

**What would you improve next?** Add OCR bounding boxes, discount-aware line-item validation, multi-user authenticated storage, durable rate limits, larger held-out evaluations and empirical confidence calibration.

## Personal preparation checklist

- Run the project and explain each core module without reading a script.
- Change a schema field yourself and demonstrate the result.
- Create at least five new unseen test documents.
- Run and record live AI evaluation if credentials are available.
- Explain two failures and why they happen.
- Keep an honest development journal of your own changes and experiments.
- Follow your college's policy on disclosing AI assistance.

No grade is guaranteed. A strong submission depends on understanding, measured evidence and a reliable demonstration as well as presentation.
