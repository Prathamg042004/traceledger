# Optional authenticated shared workspace

The local workbench remains available without Supabase. Cloud functionality is implemented separately and must not be described as live until the steps below are completed and tested. No document is uploaded automatically.

## Activate

1. Connect the Supabase account for the organization you want to use and identify that organization. Use a dedicated TraceLedger project, not another application's project. Confirm any paid plan before provisioning. The current implementation does not require a service-role key.
2. Apply `supabase/migrations/20261023193148_shared_workspaces.sql` to that project with the Supabase migration workflow. Review the migration first; it creates four new `tl_` tables and a private helper schema, with RLS enabled on every table. Do not expose `traceledger_private` through the Data API.
3. Enable email authentication. Configure the production Site URL as `https://traceledger-seven.vercel.app` and allow the redirect `https://traceledger-seven.vercel.app/?team=1`. Add exact localhost/preview redirect URLs only if you use them. Configure a suitable mail provider if needed; verify actual message delivery rather than assuming it from an accepted API response.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the hosting environment and redeploy. Use the project's publishable key, never a secret/service-role key. Browser-visible variables are bundled at build time. Preview and production should use explicitly chosen environments.
5. Open Shared workspace and sign in with an email link. Open it in the same browser profile that requested it (PKCE uses that profile's local storage). Sign out on shared machines. The application remembers the session on that browser.
6. Create a workspace. Each teammate signs in, copies their Account ID, and gives it to the owner. The owner adds that existing account as reviewer or viewer. The app does not send invitations to teammates.

## Demo acceptance checklist after activation

Use at least three separate browser profiles/accounts; sharing one account cannot demonstrate role isolation.

- Owner creates workspace; reviewer and viewer see it after refreshing/reloading the page. An unrelated fourth account cannot see it.
- Reviewer extracts a local sample, explicitly saves it, then sees shared revision 1. The shared copy has no inherited local approval or local audit claims.
- Another reviewer loads a new local working copy, edits a field, and saves revision 2. Saving an older copy fails with a conflict and instructs them to refresh/load the latest revision. Existing local documents are preserved.
- A reviewer records a note and acknowledgement/request for changes. Activity shows the authenticated account ID, database timestamp and exact revision. Acknowledgements are not financial approvals or accuracy guarantees.
- Viewer can load copies, but cannot save or add review notes (both UI and database reject writes).
- Owner removes viewer; subsequent shared reads fail/return no accessible rows. Previously downloaded/local copies cannot be remotely erased.
- Sign out, verify shared records disappear, and confirm the existing local workbench still works.
- Run Supabase security/performance advisors after migration. Inspect hosting logs without printing credentials or document contents.

## Data and limits

Saves include document text, extracted fields and line items. All workspace members can read these records. Original image/PDF bytes are not stored. Each workspace holds up to 100 shared document records; each save is limited to 250 KB, 40,000 source characters, 20 fields and 100 line items. Storage/traffic still consume the selected project's quotas. There is no automatic sync, offline conflict merge, attachment store, workspace deletion UI or realtime subscription. Use Refresh records for current revisions. A member added to an existing account uses their verified authentication ID; email addresses are not an application authorization rule.

The latest snapshot is retained, together with revision metadata and append-only activity; **historical snapshot content is not retained**. App roles cannot edit/delete events. Database administrators retain administrative control, so this is not a tamper-proof compliance ledger. Local review history remains editable browser data and is not uploaded as trusted server history.

## Verification in this branch

`npm run build` runs the whole unit suite, including an embedded PostgreSQL integration test (PGlite) that executes the actual migration with authenticated/anonymous roles. It covers owner creation, membership access, role escalation rejection, cross-workspace isolation, stale save/review rejection, revoked access, protected event writes, and server-owned actor identity. It does not test hosted Supabase email delivery, PostgREST configuration, SMTP, hosting variables or real multi-browser sessions; complete the checklist above before claiming those work in production.
