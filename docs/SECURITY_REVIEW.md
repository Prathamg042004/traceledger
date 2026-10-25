# Security review snapshot

Reviewed 2026-10-25. This is an implementation and configuration snapshot, not a penetration-test certification.

## Verified

- Live extraction requests are limited to 100,000 actual streamed bytes; oversized streams are cancelled and malformed UTF-8/JSON receives a client error.
- All 46 tests and the production build passed after the dependency refresh, including isolated Postgres tests for workspace membership, role restrictions and revision conflicts.
- The reviewed production dependency graph reported zero known advisories. Vercel reported the merged deployment complete.
- In the connected TraceLedger database, tl_documents, tl_events, tl_members and tl_workspaces all have RLS enabled. Inspected policies restrict reads to workspace members and membership changes to workspace owners; workspace creation requires the authenticated owner ID.
- Supabase's security advisor returned no table-security findings at review. Its remaining warning was disabled leaked-password protection. That feature requires an eligible paid plan; no upgrade was purchased.

## Boundaries and remaining work

- A database advisor is not proof that every application flow is secure. Real login, membership invitations, expiry, revocation and hosted role transitions still need end-to-end checks.
- Live AI uses a shared project access code. Add durable abuse and cost quotas before opening the endpoint to a broad public audience.
- Keep provider/service credentials server-side. Do not use user-editable metadata as authorization.
- Review retention, document sensitivity and provider data handling before uploading personal or confidential documents.
- Re-run dependency and database checks after changes; this snapshot will age.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [password security](https://supabase.com/docs/guides/auth/password-security).
