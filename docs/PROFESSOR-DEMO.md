# TraceLedger: professor demonstration and research plan

## One-minute introduction

TraceLedger converts invoices, purchase orders, receipts and business messages into structured records. Its contribution is the review workflow around extraction: exact source quotes, independent validation, invoice-to-order comparison, duplicate signals and explicit human approval. The current prototype uses an external language model; it does not train a new foundation model.

## Six-minute demonstration

1. Open Intelligence overview and select **Process pending documents offline**. Three sample documents are processed without API credits.
2. Show the review queue: the invoice has a validation error. The INR exposure is 86,960, the amount stated by the source. Quote coverage is provenance coverage, not accuracy.
3. Open Cross-document checks. Vendor and currency match, but invoice 86,960 conflicts with purchase order 84,960.
4. Open the invoice. Select the Total source link. Explain why extraction preserves an incorrect stated amount. Correct the value to 84960, review the fields and line items, and approve the record. Export Excel to show the source, validation and review history.
5. Open Evaluation lab and run the baseline. It scores 113/143 fields (79% rounded) on 20 synthetic fixtures. Show a prose failure alongside a labeled-text success.
6. Back up the workspace from the overview. Importing it adds records and resets approval checks. The duplicate invoice signal then illustrates how repeated vendor/invoice pairs are flagged for review.

Optional live AI demonstration: enter your private project access code in Project settings, choose Live AI in Document workspace and extract a prose document. Confirm a successful request before presenting it. The 20-case live evaluation spends provider credits. No live score is claimed until measured.

## Current evidence

- 22 automated tests passed on 14 October 2026, covering core extraction, validation, API request guards, workbook export, currency separation and backup trust boundaries.
- Production build passed locally. Browser checks verified batch processing, the review queue, invoice/PO discrepancy and baseline evaluation.
- Baseline evaluation: 20 synthetic cases, 143 expected fields, 113 exact matches. This small public development set does not establish real-world accuracy.
- Offline extraction works without a provider account. Live AI verification still requires an authenticated model request.

## Research question

Does source-linked extraction plus deterministic business checks reduce unsupported or inconsistent values reaching approval compared with AI extraction alone, without excessive review time?

## Proposed pilot and funding milestones

These are proposed activities and targets, not completed experiments or guaranteed outcomes.

| Stage | Deliverable | Evidence required |
| --- | --- | --- |
| Dataset | 200 consented, de-identified or synthetic documents across multiple layouts | Annotation guide, double annotation subset and frozen test split |
| Experiment | Baseline vs AI-only vs AI plus validation | Field exact match, missing-value precision/recall, unsupported-value rate, latency and token cost |
| Usability | Small supervised study with volunteer reviewers | Task completion time, correction rate and review errors; consent and anonymized observations |
| Pilot | Controlled deployment for one partner workflow | User accounts, durable isolated storage, retention controls and quotas |

Budget categories: dataset annotation, limited model calls, hosting/storage, accessibility testing and pilot support. Obtain quotations and align the budget with the chosen funding call before submission. Eligibility and grant availability have not been assessed.

## Honest boundaries for viva

Exact quote presence does not prove semantic correctness. Duplicate detection does not establish fraud. Amounts are grouped by currency; there is no exchange-rate conversion. Local history can be edited and is not an immutable audit trail. This is a single-reviewer browser-local prototype, with shared access-code protection for paid model calls. Multi-user accounts, a durable database, calibrated confidence and a real-world held-out evaluation remain development milestones.

## Team roles from the synopsis

- Pratham Gupta (23EARCS106): Project Lead and Backend Developer.
- Raghav Gautam (23EARCS113): AI/ML Engineer.
- RS Abhay Thakur (24EARCS211): Frontend Developer (UI/UX).
- Suray Prakash (23EARAD171): Testing and Documentation Engineer.

Development was AI-assisted. Role assignments are from the synopsis; they are not a verified individual contribution log.
