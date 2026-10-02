# Le Lac roadmap

This file tracks product milestones. `README.md` describes the current architecture and shipped workflows; this page records what is complete and what remains to verify.

## Current position — user-managed dashboards

**In progress.** Turn the three fixed tabs into a user-owned collection while preserving existing dashboards and account data.

- [x] Define the collection model and versioned export format that can accept future dashboard and widget types.
- [x] Keep old version-1 configuration exports importable.
- [x] Preserve stable IDs for Quotidien, Tech and Cinéma.
- [x] Add a forward-only D1 migration for custom IDs and per-user names/order; preserve existing configuration rows.
- [x] Add create, rename, reorder and delete operations, with at least one dashboard retained; the first dashboard is the home dashboard.
- [x] Keep local recovery copies and authenticated per-user D1 sync aligned.
- [x] Verify account isolation against the changed D1 API with two users on a local Worker and disposable D1 database.
- [ ] Verify desktop/mobile management UI and route navigation in an authenticated browser, including an import/export round trip.
- [ ] Apply the D1 migration in production after confirming the deployed database snapshot/recovery point, then deploy and verify the account flows.

## Shipped foundations

- Three editable dashboards with responsive layouts, widget add/configure/remove, undo and keyboard access.
- Light, dark and system appearance preferences.
- Versioned configuration import/export, themes and per-user D1 persistence.
- Email/password registration, email verification, login, password reset and account deletion.
- Cloudflare Worker deployment with CI checks before production deployment.
- Cinema screenings, upcoming films, curated YouTube trailers and Netflix, Apple TV, Prime Video and Disney+ announcements.

## After this milestone

1. **Review the new dashboard workflow in production.** Tune naming, ordering and reset behavior from actual use before expanding the catalog.
2. **Address usability gaps surfaced by that review.** Prefer concrete accessibility, mobile, recovery and onboarding issues over speculative features.
3. **Choose the next product feature from usage.** Candidate areas include additional reliable content sources and optional public sharing; neither is committed until the dashboard milestone is stable.

## Intentionally deferred

OAuth, passwordless email links, public dashboard sharing, Docker/Umbrel packaging, plugin marketplace/sandbox/SDK, and YAML editing remain deferred. Account deletion is shipped and documented in [production operations](operations.md).
