# Le Lac roadmap

This file tracks product milestones. `README.md` describes the current architecture and shipped workflows; this page records what is complete and what remains to verify.

## Current position — dashboard management polish

**Core milestone complete.** User-owned dashboards replace the original fixed tabs while preserving stable IDs, existing configuration, and per-account data. This pass adds quick per-tab rename/delete actions and drag-to-reorder in the management dialog; the authenticated browser review is complete on desktop and touch-sized layouts.

- [x] Define the collection model and versioned export format that can accept future dashboard and widget types.
- [x] Keep old version-1 configuration exports importable.
- [x] Preserve stable IDs for Quotidien, Tech and Cinéma.
- [x] Add a forward-only D1 migration for custom IDs and per-user names/order; preserve existing configuration rows.
- [x] Add create, rename, reorder and delete operations, with at least one dashboard retained; the first dashboard is the home dashboard.
- [x] Keep local recovery copies and authenticated per-user D1 sync aligned.
- [x] Verify account isolation against the changed D1 API with two users on a local Worker and disposable D1 database.
- [x] Verify desktop/mobile management UI and route navigation in an authenticated browser, including an import/export round trip on an isolated local D1 database.
- [x] Confirm a current Time Travel recovery bookmark is available for the production D1 database before migration.
- [x] Apply the pending D1 migration in production and deploy after authorization; verify the public login/home routes and that the boards API rejects unauthenticated requests.
- [x] Verify authenticated account flows against production using designated test accounts; local account isolation and browser workflows are covered with disposable data.
- [x] Add an add-dashboard action and per-tab rename/delete actions with confirmation for deletion.
- [x] Support pointer drag-to-reorder in the management dialog while retaining keyboard-accessible move controls.
- [x] Verify the new tab menu, inline rename, deletion confirmation, keyboard shortcuts, and dialog drag interaction in the authenticated browser, including a 390px touch-sized viewport.
- [x] Reuse the resolved account dashboard during in-app navigation to avoid flashing the route-loading screen between boards.

## Shipped foundations

- Three editable dashboards with responsive layouts, widget add/configure/remove, undo and keyboard access.
- Light, dark and system appearance preferences.
- Versioned configuration import/export, themes and per-user D1 persistence.
- Email/password registration, email verification, login, password reset and account deletion.
- Cloudflare Worker deployment with CI checks before production deployment.
- Cinema screenings, upcoming films, curated YouTube trailers and Netflix, Apple TV, Prime Video and Disney+ announcements.

## After this milestone

1. **Address usability gaps surfaced by the dashboard management review.** Prefer concrete accessibility, mobile, recovery and onboarding issues over speculative features.
2. **Choose the next product feature from usage.** Candidate areas include additional reliable content sources and optional public sharing.

## Intentionally deferred

OAuth, passwordless email links, public dashboard sharing, Docker/Umbrel packaging, plugin marketplace/sandbox/SDK, and YAML editing remain deferred. Account deletion is shipped and documented in [production operations](operations.md).
