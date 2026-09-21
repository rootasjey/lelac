# Encascade

Personal dashboards for your interests, composed and edited visually. Built with Nuxt, Vue, UnaUI and UnoCSS, inspired by [Glance](https://github.com/glanceapp/glance).

## Product direction

Encascade brings news, videos and everyday information into calm, readable dashboards. Its main argument is visual editing: add a source, configure its widget and rearrange the page directly in the app. Deployment to your own Cloudflare Workers account is the second core goal.

Glance is the visual reference for composition, spacing, typography and restrained color. Encascade accepts additional JavaScript and runtime overhead in exchange for a better editing experience. Responsiveness and sensible resource usage still matter; matching Glance's binary size or performance is not a release requirement.

## Initial scope

- Multiple personal dashboards with working navigation.
- A polished reading experience on desktop and mobile.
- Visual widget settings and drag-and-drop arrangement within a constrained layout.
- Persistent dashboard configuration.
- Cloudflare Workers as the only initial deployment target.

Prioritize complete everyday workflows over the number of widget types.

### Intended dashboards

| Dashboard | Intended content |
|---|---|
| Daily | Selected RSS news, local weather, clocks for several cities |
| Tech | RSS feeds, weekly GitHub trends, recent uploads from selected YouTube channels |
| Cinema | Weekly film releases for a selected country |

The first polished dashboard should establish the design with RSS, weather and world clocks. YouTube, GitHub trends and cinema follow once that foundation works reliably. Define the GitHub trend source and ranking period explicitly; tracked repository releases are a separate feature. Cinema releases and local screening schedules are also separate scopes.

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

Use a Vue package for pointer interactions and build Encascade's editing UI around it. Do not implement a custom drag engine.

The main dashboard now uses `grid-layout-plus` pinned to `2.0.0-beta.0`, with a 12-column layout and fixed user-selected heights. Keep grid configuration objects stable during interactions. The earlier `vue-draggable-plus` components remain unused by the main route.

Widgets have independent IDs, configuration and geometry. The app persists its own versioned model rather than the package's internal state. RSS capacity is measured from rendered row heights; a separate reading dialog exposes the rest of the feed.

## Technical direction

- **UI:** Nuxt 4, Vue 3, TypeScript, UnaUI and UnoCSS.
- **State:** Pinia with stable widget identifiers and validated configuration.
- **Deployment target:** Nuxt/Nitro on Cloudflare Workers.
- **Planned persistence:** D1 for dashboard and widget configuration; browser storage remains the current prototype mechanism.
- **Data fetching:** server-side source adapters with appropriate caching, timeouts and independent widget failure handling. Choose a cache backend when the first real integrations establish the requirements.

Keep the architecture focused on Workers. NuxtHub can be evaluated as an integration convenience; it is not a prerequisite for the product. There is no initial multi-platform storage abstraction.

The first deployment is for personal use. Protect configuration writes before exposing a deployed instance; a multi-user account system is outside the initial scope.

## Current dashboard

The `/` route is the usable daily dashboard: add, configure, move, resize and remove RSS, weather, world-clock and YouTube widgets. Undo covers layout, settings, additions and deletions within the current session. A cancelled addition leaves no provisional widget.

- Configuration is validated and saved locally under `encascade:board:v1`. Legacy `distill-config` and earlier demonstration layouts are not migrated; this integration starts fresh.
- Desktop supports drag/resize and keyboard-accessible adjustment controls. Mobile stacks widgets in desktop reading order and supports adding, configuring and removing widgets. Geometry editing remains desktop-only.
- RSS and Atom feeds are fetched and parsed directly by the server from public HTTPS URLs; redirects are checked, responses are limited to 2 MiB and 12 seconds, and results are cached for 5 minutes. No conversion service or API key is required. Articles link to their original sources.
- YouTube channel feeds use the official YouTube Data API through a server endpoint. Set `NUXT_YOUTUBE_API_KEY` in a local `.env` file for `bun run dev`, or as a Cloudflare Worker secret for deployment. The key never reaches the browser; recent video metadata is cached for 15 minutes.
- Weather and city search use Open-Meteo. Search results must be explicitly selected. Clocks accept one to three named IANA timezones.
- Nitro source endpoints have timeouts and caches (RSS: 5 minutes; weather: 10 minutes; city search: 1 hour). Visible widgets refresh every 10 minutes. Manual refresh reads the same server cache. Previously loaded data remains visible on refresh errors during the session; source changes clear the previous source.
- Grid rendering starts after client mounting. Nitro and Wrangler are configured for Cloudflare Workers; the production deployment, multiple dashboards, YAML editing and D1 persistence remain unfinished. Legacy widgets are not offered in the new catalog.

## Delivery order

1. **Polished reference dashboard:** coherent Glance-inspired design, representative real content, readable mobile layout and reliable RSS/weather/clock widgets.
2. **Complete visual workflow:** dashboard navigation, add/configure/move/remove widgets, undo, accessible move controls and reload persistence. Evaluate the layout package only against concrete needs.
3. **Workers runtime and persistence:** verify the app in Wrangler locally and in production, add durable configuration storage, protect writes and review source caching and failure states.
4. **Expand useful content:** explicitly defined GitHub trends and country-specific cinema releases.

Each milestone should be usable before expanding the scope. Validate desktop and mobile rendering, the full edit/save/reload flow, and the actual Workers runtime before claiming those paths are complete.

## Deferred

Docker and Umbrel packaging, plugin marketplace, third-party plugin sandbox, plugin SDK, multi-user accounts and public dashboard sharing are outside the initial scope. Revisit them only when actual usage justifies the cost.

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

`bun run dev` starts Nuxt locally. `bun run build` produces the Cloudflare Worker artifact; `bun run preview` builds it and starts Wrangler locally. `bun run deploy` builds and deploys to Cloudflare Workers. Check types with `bun run typecheck` and run tests once with `bun run test --run`.

## References

- [Glance](https://github.com/glanceapp/glance)
- [Nuxt on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/nuxt/)
- [Vue Draggable Plus: moving between lists](https://vue-draggable-plus.pages.dev/en/demo/tow-list/)
- [Grid Layout Plus releases](https://github.com/qmhc/grid-layout-plus/releases)
- [Grid Layout Plus v2 migration](https://docs-next--grid-layout-plus.netlify.app/guide/migration)

## License

[MIT](LICENSE).
