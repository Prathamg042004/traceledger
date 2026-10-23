# TraceLedger presentation readiness check

Checked on 24 October 2026 (India time). Production was checked at merge d9dc1e8; the recovery fixes and built-in file samples were additionally checked on the PR #4 preview.

## Confirmed in the browser

| Flow | Result and evidence |
| --- | --- |
| Project showcase and navigation | All eight pages load and the showcase opens the workspace |
| Batch offline extraction | Three original samples processed; existing extracted records preserved |
| Required fields and arithmetic | Invoice 86,960 versus subtotal + tax 84,960 is blocked from approval |
| Reconciliation | Vendor/currency matched; invoice versus PO total produced the expected 2,000 conflict |
| Quality desk | Blocked filter isolated the faulty invoice, with independent completeness/source/review metrics |
| Source evidence | Invoice-number quote opened against preserved source text |
| Human edits and history | Changing total 86,960 to 84,960 recorded before/after history and retained original source |
| Approval | Unreviewed records were rejected; reviewing all fields and two items enabled approval; approved inputs were disabled |
| Pasted receipt | Seven receipt fields and a line item extracted from synthetic pasted input |
| Manual line items | Added blank item produced validation errors; removing it removed the item and errors |
| Search | Nonmatching search produced the expected empty-search message |
| Schemas | Empty schema rejected; valid receipt template saved; custom two-field schema applied to extraction and JSON output |
| Baseline evaluation | 20 fixtures, 143 fields, 113 normalized exact matches (79%); no production-accuracy claim |
| Duplicate invoice identity | Same vendor/invoice-number pair identified across two different sources |
| Remember workspace | Workspace survived reload on production; validated restore also survived reload on the new preview; test storage then disabled |
| Text PDF | Built-in fictional PDF passed PDF.js ingestion; seven fields and the item row extracted |
| Image OCR | Built-in receipt image passed English OCR; seven of seven fields source-linked |
| Scanned PDF | Built-in scanned receipt passed PDF rendering plus OCR; seven of seven fields source-linked |
| Browser errors | No captured console errors on the final preview checks |
| Missing AI access code | Live extraction returned an actionable Settings error; no fabricated AI result substituted |

## Automated validation

29 tests pass. Coverage includes required/missing fields, invalid dates and arithmetic, source evidence, reconciliation, safe CSV, typed Excel workbook roundtrip, backup approval reset, malformed backups, duplicate document/field identifiers, validated local restore, quality metrics, exact text ingestion and unsupported/oversize files. Next.js production build passes.

## Fixes prepared in PR #4

- Validate saved browser document data before loading; recover to sample pack on malformed data.
- Reject duplicate field keys in backups.
- Enforce the 100-document cap on pasted text and backup imports as well as file batches.
- Disable upload close while processing.
- Add reproducible synthetic PDF, scanned PDF and image samples using the real ingestion pipeline.

## Checks with remaining limitations

| Flow | Remaining requirement |
| --- | --- |
| Authenticated live AI extraction and 20-call comparison | Server reports configured, but the project access code was not supplied in the test session. User must enter it in Project settings. Model credits/availability are not proven by the configuration flag. |
| Physical local-file selection, multi-file selection, backup-file import | Extension selected a file but could not read it. Enable Allow access to file URLs in the ChatGPT Chrome extension, then repeat. Built-in PDF/OCR pipeline tests passed independently. |
| Download delivery | Excel, CSV and JSON handlers completed with approved-status notices; Excel bytes also passed an automated workbook roundtrip. Browser download-event retrieval timed out, so final files in the user's Downloads folder were not independently inspected. Other export buttons and file-backup restore need a manual download/re-import check. |
| Responsive/mobile layout | Desktop was visually checked. Requested viewport override did not change reported innerWidth, so no mobile-pass claim is made. Use the presentation laptop for rehearsal. |

## Presentation rehearsal

1. Use a laptop with internet, load the site in advance, and keep a backup copy of the demo data.
2. In Intelligence overview, process pending original samples offline.
3. Demonstrate the invoice validation error and PO conflict; explain that source data is preserved.
4. Open Add document and load Text PDF, Receipt image and Scanned PDF. OCR first use downloads resources, so warm it up on the actual presentation browser/network.
5. Show fields, JSON, evidence and a custom schema. Review each field and item before approving.
6. Export Excel, open it from Downloads, and check the Document, Fields, Line items, Validation, Review history and Source text sheets.
7. Run the baseline benchmark. Only demonstrate live AI after entering the access code and completing a real successful extraction.
8. Do not call offline label matching AI, source coverage accuracy, or browser-local history an immutable audit log. Actual stack is React/Next.js, PDF.js, Tesseract.js and ExcelJS; it differs from the proposed Python stack.
