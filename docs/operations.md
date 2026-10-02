# Production operations

## D1 recovery

The production Worker uses `lelac-auth-prod` with the `Workers Paid` account. Cloudflare D1 Time Travel is enabled automatically and provides point-in-time recovery for the previous 30 days on that plan. It is the first recovery path for accidental account deletion, bad data writes, or a failed migration; no scheduled backup job is required for that window.

Inspect the database version and available recovery point before relying on Time Travel for a recovery:

```sh
bunx wrangler d1 info lelac-auth-prod --config wrangler.production.jsonc
bunx wrangler d1 time-travel info lelac-auth-prod --config wrangler.production.jsonc
```

To recover, choose the exact time before the unwanted change and have the operator confirm the destructive restore:

```sh
bunx wrangler d1 time-travel restore lelac-auth-prod --timestamp="2026-10-02T12:00:00Z" --config wrangler.production.jsonc
```

The restore overwrites the live database. Record the `previous_bookmark` returned by Wrangler before accepting; it is the undo point if the chosen timestamp is wrong. Verify login, account ownership, and board reads after restoration. Do not include a production export or database contents in Git. Time Travel does not provide an off-account copy beyond its retention window; if that becomes necessary, design an encrypted export destination and a tested restore drill separately.

## Authentication email failures

Worker Observability is enabled in `wrangler.production.jsonc`. Email delivery failures emit the structured event `auth_email_delivery_failed`, with the action and exception type only. The recipient, message, and token-bearing URL are deliberately omitted from the log.

Follow live Worker logs while testing or investigating delivery:

```sh
bunx wrangler tail lelac --config wrangler.production.jsonc
```

Look for `auth_email_delivery_failed`; then check the Cloudflare Email Service sender/domain status and binding configuration. Registration and password-reset endpoints return a generic service error if the provider rejects a send. A failed registration send may leave a pending account; retrying registration for that address issues a fresh verification token.

## Account deletion

The authenticated deletion endpoint requires the current password and the exact confirmation `SUPPRIMER`. It deletes only the current account; D1 cascades remove that account's dashboards, dashboard definitions and authentication tokens. The app clears the session and local dashboard copies after the endpoint succeeds. Do not run a deletion against a real account as an operational test; use the isolated test database in `tests/authApi.test.ts`.
