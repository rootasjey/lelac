# Le Lac roadmap

This file tracks product milestones. `README.md` describes the current architecture and shipped workflows; this page records what is complete and what remains to verify.

## Current position — product follow-up

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
- [x] Keep add/manage actions visible in the mobile tab row and bring the active tab into view on direct dashboard entry; verify at 390×844.
- [x] Match the dashboard-manager close tooltip to the dark theme on mobile.

## Shipped foundations

- Three editable dashboards with responsive layouts, widget add/configure/remove, undo and keyboard access.
- Light, dark and system appearance preferences.
- Versioned configuration import/export, themes and per-user D1 persistence.
- Email/password registration, email verification, login, password reset and account deletion.
- Cloudflare Worker deployment with CI checks before production deployment.
- Cinema screenings, upcoming films, curated YouTube trailers and Netflix, Apple TV, Prime Video and Disney+ announcements.
- Revocable, read-only public links for individual dashboards; shared pages expose only the selected board and remain isolated from account state.
- Optional share-link expiration; verified in production for anonymous access before expiry and rejection after expiry, then cleaned up the disposable test dashboard.

## After this milestone

1. **Choose the next product feature from usage.** Candidate areas include additional reliable content sources and collaboration features beyond read-only sharing.

### Mobile review completed

- [x] Check login, registration, password recovery/reset forms and account settings at 320×740 and 390×844; no horizontal overflow, and form controls retain their labels and touch size.
- [x] Check the widget catalog, widget settings and YouTube full-list dialog at 390×844; verify catalog scrolling, city search results, and readable dialog layout.
- [x] Return keyboard focus to the opening control when the widget catalog or settings dialog closes, including canceling a newly selected widget.
- [x] Keep widget-settings actions at least 40px high and align their mobile visual order with keyboard order.

### Keyboard and reduced-motion review completed

- [x] Verify keyboard traversal and focus containment in dashboard management; use the move controls and return focus to the opener after closing.
- [x] Verify the `A` and `E` shortcuts, search autofocus, and that shortcuts do not fire while a dialog or input is active.
- [x] Verify widget settings and delete confirmations can be opened, canceled, and closed with the keyboard, restoring focus without saving or deleting.
- [x] Honor reduced motion in dashboard, widget settings, and confirmation dialogs; keep dialog close animations lifecycle-safe and disable dashboard drag animation.

## Intentionally deferred

OAuth, passwordless email links, Docker/Umbrel packaging, plugin marketplace/sandbox/SDK, and YAML editing remain deferred. Account deletion is shipped and documented in [production operations](operations.md).
