# Le Lac

> Composez votre quotidien

Personal dashboards for your interests, composed and edited visually. Built with Nuxt, Vue, UnaUI and UnoCSS, inspired by [Glance](https://github.com/glanceapp/glance).

## Product direction

Le Lac brings news, videos and everyday information into calm, readable dashboards. Its main argument is visual editing: add a source, configure its widget and rearrange the page directly in the app. Deployment to your own Cloudflare Workers account is the second core goal.

Glance is the visual reference for composition, spacing, typography and restrained color. Le Lac accepts additional JavaScript and runtime overhead in exchange for a better editing experience. Responsiveness and sensible resource usage still matter; matching Glance's binary size or performance is not a release requirement.

## Initial scope

- Multiple personal dashboards with working navigation.
- A polished reading experience on desktop and mobile.
- Visual widget settings and drag-and-drop arrangement within a constrained layout.
- Persistent dashboard configuration.
- Cloudflare Workers as the only initial deployment target.

Prioritize complete everyday workflows over the number of widget types.

### Dashboards

| Dashboard | Intended content |
|---|---|
| Daily | Selected RSS news, local weather, clocks for several cities |
| Tech | RSS feeds, weekly GitHub trends, recent uploads from selected YouTube channels |
| Cinema | Local screenings, upcoming theatrical programming, streaming announcements and curated trailers |

The three dashboards now share the same visual editing foundation. Keep GitHub trend rankings distinct from tracked repository releases, and keep local cinema screenings distinct from upcoming theatrical programming and streaming announcements.

## Design and editing

- Let content lead: a dominant reading column, quieter supporting columns, subtle surfaces and a restrained accent.
- Keep metadata readable and use consistent spacing and typography across widgets.
- Adapt presentation to content: lists, clocks and video galleries need different treatments.
- Keep explicit reading and editing modes, with faithful previews while editing.
- Offer a small set of column widths and predictable drop positions rather than pixel-level free placement.
- Support undo for moves and deletion, plus a non-drag move command for keyboard and touch use.
- Preserve a meaningful mobile reading order.
- Show sources and update times; distinguish stale data, empty results and failures. Keep previously loaded content when a refresh fails where possible.

### Drag-and-drop approach

Use a Vue package for pointer interactions and build Le Lac's editing UI around it. Do not implement a custom drag engine.

The main dashboard uses `grid-layout-plus` pinned to `2.0.0-beta.0`, with a 12-column layout and fixed user-selected heights. Keep grid configuration objects stable during interactions. Widget settings use `vue-draggable-plus` to reorder clock cities.

Widgets have independent IDs, configuration and geometry. The app persists its own versioned model rather than the package's internal state. RSS capacity is measured from rendered row heights; a separate reading dialog exposes the rest of the feed.

## Technical direction

- **UI:** Nuxt 4, Vue 3, TypeScript, UnaUI and UnoCSS.
- **State:** Pinia with stable widget identifiers and validated configuration.
- **Deployment target:** Nuxt/Nitro on Cloudflare Workers.
- **Persistence:** D1 stores accounts and per-user dashboard/widget configuration; browser storage remains a local recovery copy.
- **Data fetching:** server-side source adapters with appropriate caching, timeouts and independent widget failure handling. Choose a cache backend when the first real integrations establish the requirements.

Keep the architecture focused on Workers. NuxtHub can be evaluated as an integration convenience; it is not a prerequisite for the product. There is no initial multi-platform storage abstraction.

Open email/password registration is implemented locally. Accounts must verify their email address before signing in. OAuth and passwordless email links remain deferred.

## Delivery status and next milestone

The visual editing workflow, responsive dashboard views, settings page, light/dark/system themes, and versioned configuration import/export are implemented. The three dashboards and their cinema and streaming widgets are also in place. Account registration, verification, login, password reset, and per-user D1 dashboard storage are implemented for local development; production D1 and email-service resources are not provisioned.

The next milestone is to prepare and verify authenticated production deployment. Complete it in this order:

1. Verify the production build and app routes in Wrangler's local Worker runtime.
2. Provision and bind the production D1 database, then apply the checked-in migrations.
3. Configure `NUXT_SESSION_PASSWORD`, `NUXT_PUBLIC_APP_URL`, and Cloudflare Email Service with an approved sender on the verified `corpinot.cc` domain.
4. Verify registration, email verification, login, password reset, per-user board isolation, and save/reload on Workers before opening registration to public use.
5. Add operational safeguards such as backups, account deletion, and monitoring based on deployment needs.

The Worker production build, local D1 migrations, and a local Wrangler preview are verified. Dashboard APIs require an authenticated session and validate saved configurations. Production resources, sender-domain onboarding, email delivery, and deployment verification remain outstanding. Do not expose registration publicly until those production prerequisites and an end-to-end test are complete.

## Current dashboard

The `/` route opens Quotidien; Tech and Cinéma open separate dashboards. Tech is seeded with Google Developers videos, GitHub Blog and Cloudflare Workers AI RSS feeds, GitHub Trending repositories and developers, and recent OpenRouter models. Cinéma includes SCARE screenings and upcoming programming, a curated FilmsActu trailer feed, and Netflix, Apple TV, Prime Video and Disney+ release widgets. The catalogue also offers weather, clocks and Hacker News. Each dashboard supports adding, configuring, moving, resizing and removing widgets. Undo covers layout, settings, additions and deletions within the current session. A cancelled addition leaves no provisional widget.

- Quotidien keeps its configuration under `lelac:board:v1`; Tech uses `lelac:board:v1:tech`. Earlier demonstration layouts are not migrated.
- Desktop supports drag/resize and keyboard-accessible adjustment controls. Mobile stacks widgets in desktop reading order and supports adding, configuring and removing widgets. Geometry editing remains desktop-only.
- RSS and Atom feeds are fetched and parsed directly by the server from public HTTPS URLs; redirects are checked, responses are limited to 2 MiB and 12 seconds, and results are cached for 5 minutes. No conversion service or API key is required. Articles link to their original sources.
- YouTube channel feeds use the official YouTube Data API through a server endpoint. Set `NUXT_YOUTUBE_API_KEY` in a local `.env` file for `bun run dev`, or as a Cloudflare Worker secret for deployment. The key never reaches the browser; recent video metadata is cached for 15 minutes.
- GitHub Trending repositories are read from GitHub's public Trending page through a server endpoint. Period and programming-language filters are passed independently for each widget instance; responses are cached for 15 minutes. This does not require an API key, but the HTML source is an external contract that should be monitored before a public deployment.
- GitHub Trending developers use the corresponding public developers page through a separate server endpoint. The widget keeps its own period and programming-language settings and returns each profile's avatar, handle and popular repository. This also does not require an API key and relies on GitHub's public HTML contract.
- Hacker News uses its public Firebase API through a cached server endpoint. It requires no API key and keeps the discussion score, comments, source domain and publication date for each story.
- OpenRouter model metadata is public. To show the optional recent throughput comparison, set `NUXT_OPENROUTER_API_KEY` as a server-only secret; the app reads provider `p50` throughput over 30 minutes for up to the 12 newest models, and shows the column only in sufficiently wide tables. Without a key, the throughput column stays hidden; when the key is present but a model has no reported measurement, its cell shows a dash. The key is never sent to the browser.
- Weather and city search use Open-Meteo. Search results must be explicitly selected. Clocks accept one to three named IANA timezones.
- Nitro source endpoints have timeouts and caches (RSS: 5 minutes; weather: 10 minutes; city search: 1 hour). Visible widgets refresh every 10 minutes. Manual refresh reads the same server cache. Previously loaded data remains visible on refresh errors during the session; source changes clear the previous source.
- Grid rendering starts after client mounting. Nitro and Wrangler are configured for Cloudflare Workers; production deployment, creating or renaming dashboards, and YAML editing remain unfinished. Legacy widgets are not offered in the new catalog.

## Delivery order

1. **Polished reference dashboard:** implemented locally with representative content and readable mobile layouts.
2. **Complete visual workflow:** implemented locally, including navigation, add/configure/move/resize/remove, undo, accessible adjustment controls, themes and portable configuration backups. Browser storage still limits persistence to one browser.
3. **Workers runtime and durable persistence:** local Worker build/preview, D1 schema, authenticated account flows and protected configuration endpoints implemented; production provisioning and verification remain.
4. **Useful content:** the current Tech and Cinema boards include independent trends, screenings, trailers and streaming announcements. Expand sources when a reliable source adds clear value.

Each milestone should be usable before expanding the scope. Validate desktop and mobile rendering, the full edit/save/reload flow, and the actual Workers runtime before claiming those paths are complete.

## Deferred

OAuth, passwordless magic links, account deletion, public dashboard sharing, Docker and Umbrel packaging, plugin marketplace, third-party plugin sandbox, plugin SDK, and YAML editing are deferred. Revisit them only when actual usage justifies the cost.

## Local development

```sh
bun install
bun run dev
```

To use the YouTube widget locally, enable YouTube Data API v3 in a Google Cloud project and add its API key to an ignored `.env` file:

```sh
NUXT_YOUTUBE_API_KEY=your-key
```

For a deployed Worker, add the same secret with `bunx wrangler secret put NUXT_YOUTUBE_API_KEY`. Restrict the key to YouTube Data API v3 in Google Cloud. Review YouTube's [developer policies](https://developers.google.com/youtube/terms/developer-policies) before publishing the integration.

OpenRouter throughput is optional. Add an API key to the ignored `.env` file to enable the 30-minute provider measurements:

```sh
NUXT_OPENROUTER_API_KEY=your-key
```

For a deployed Worker, add it with `bunx wrangler secret put NUXT_OPENROUTER_API_KEY`.

`bun run dev` starts Nuxt locally. `bun run build` produces the Cloudflare Worker artifact; `bun run preview` builds it and starts Wrangler locally. `bun run deploy` builds and deploys to Cloudflare Workers. Check types with `bun run typecheck` and run tests once with `bun run test --run`.

Authentication requires a `NUXT_SESSION_PASSWORD` of at least 32 characters. For local Worker auth testing, build first, apply D1 migrations with `bunx wrangler d1 migrations apply lelac-auth-local --local`, then set a local-only `NUXT_PUBLIC_APP_URL` and `NUXT_SESSION_PASSWORD` before `bunx wrangler dev --local`. Wrangler's local email binding is not a production delivery setup. Production also requires a provisioned D1 database, an onboarded sender domain, and Cloudflare Email Service configuration.

## References

- [Glance](https://github.com/glanceapp/glance)
- [Nuxt on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/)
- [Vue Draggable Plus: moving between lists](https://vue-draggable-plus.pages.dev/en/demo/tow-list/)
- [Grid Layout Plus releases](https://github.com/qmhc/grid-layout-plus/releases)
- [Grid Layout Plus v2 migration](https://docs-next--grid-layout-plus.netlify.app/guide/migration)

## License

[MIT](LICENSE).
