# TraceLedger engineering defence and team ownership

## What the project demonstrates

TraceLedger is a document-intelligence workbench: PDFs/images/messages → text/OCR → document routing → typed extraction → evidence checks and business validation → human review → reconciliation → portable Excel/JSON output. It is more than a model prompt because validation, review state, routing, matching, exports and reproducible evaluation are implemented independently.

## New technical modules

| Module | Implementation and viva discussion |
| --- | --- |
| Document routing | Weighted heading/identifier rules distinguish invoices, receipts, purchase orders and emails. Close scores or insufficient signals abstain. These are explainable heuristics, not a trained classifier or calibrated confidence. |
| Line matching | Resolve an exact PO reference; reject ambiguous order candidates; verify vendor and currency; normalize descriptions using Unicode NFKC, case and whitespace; compare quantities and unit prices. Repeated descriptions remain manual. Missing items and changed quantity/price become conflicts. |
| Review inbox | Deterministic error/pending-review sorting, status/type/search filters, selection retained across filters and consolidated Excel export. No batch-approval shortcut bypasses field review. |
| Batch workbook | Document identifiers join summary, field, item, validation and review-history sheets. Numbers are typed; draft state and original values survive export. Mixed currencies are not combined. |
| Schema portability | JSON import/export accepts 1–20 unique typed fields and rejects malformed, oversized and invalid definitions. Imported schemas apply to future extraction, not existing approved records. |

## Complexity and tradeoffs

At most 100 documents and 100 items per record are supported. Item reconciliation currently uses readable in-memory scans, making a pair O(n²) in the number of items. At this explicit size limit it is suitable for an academic workbench; indexed joins and a database would be appropriate at larger scale. Matching does not assume that equal totals imply equal items. Exact descriptions deliberately avoid the false positives of fuzzy similarity. Duplicate order references block automated item matching.

Source quotes establish that text exists in the source; they do not prove that the value is correct. Numeric/date validators and human review remain necessary. Source text is preserved while edits retain an original value and a review event. Browser-local review history is not immutable or multi-user authenticated.

## Four-person ownership framework

The synopsis lists these roles. Use them as a responsibility map and explain only work each member actually performed, reviewed or now understands. This is not a verified historical contribution record.

| Member | Synopsis role | Modules to own and demonstrate |
| --- | --- | --- |
| Pratham Gupta | Project lead and backend developer | Extraction API contract, access-code protection, schema validation, business rules, reconciliation and export structure |
| Raghav Gautam | AI/ML engineer | OCR-versus-PDF ingestion, live model structured output, abstention/evidence prompting, routing heuristics and model-versus-baseline evaluation |
| RS Abhay Thakur | Frontend UI/UX developer | Workspace, evidence viewer, input routing controls, review inbox, filtering/selection and human approval interactions |
| Suray Prakash | Testing and documentation engineer | Fixtures, regression tests, workbook roundtrips, browser demo scenarios, limitations, reproducible evaluation and engineering documentation |

## Twelve-week development structure

This is a planning/reference structure, not a claim that work happened on these dates. Reconstruct an actual retrospective only from commits, lab notes and each member's verified work.

| Weeks | Engineering workstream | Reviewable deliverable |
| --- | --- | --- |
| 1–2 | Requirements and input schemas | Synopsis-to-feature mapping, sample data, field contracts |
| 3–4 | PDF/text/image ingestion | Text preservation and OCR pipeline with failure limits |
| 5–6 | Extraction and evidence | Offline parser, live model contract, missing-value policy |
| 7–8 | Validation and review | Arithmetic/date checks, source quotes, edits and approvals |
| 9–10 | Procurement workflow | Header/item matching, duplicate detection, review queue and batch exports |
| 11–12 | Evaluation and defence | Synthetic benchmark, regression suite, browser rehearsal and documented limits |

## Strong demo sequence

1. Explain the six-stage pipeline from the project showcase.
2. Paste a receipt with Auto-detect selected; inspect the routing explanation and extract it.
3. Process the original invoice and PO samples offline. Show the header total conflict while item quantities/prices match.
4. Change one invoice item's quantity or unit price; reconciliation should show the specific conflict. Restore the original or re-extract afterwards.
5. Filter the review inbox to blocked invoices, select records, then export the selected workbook. Show that draft status and evidence travel with it.
6. Export a schema, import it and re-extract a document. Explain the distinction between changing a contract and modifying an existing record.
7. Run the evaluation lab; distinguish synthetic exact-match performance from production accuracy.

## Remaining work worth doing after the presentation

Authenticated multi-user accounts, a durable database, independent reviewer identity, server-side upload processing, calibrated extraction uncertainty, multi-language OCR, large real-world annotated datasets and external accounting integrations. These are substantial additional projects; they should not be represented as already implemented.
