# Vitrine

A lightweight, self-hosted dashboard built with Nuxt, inspired by Glance but with visual UI customization and a future plugin marketplace.

## Motivation

[Glance](https://github.com/glanceapp/glance) (34.8k ⭐) is an excellent self-hosted dashboard built with Go, offering widgets for RSS, Reddit, Hacker News, weather, YouTube, and more. However, its configuration is entirely YAML-file-based — there is no visual editor for layout or widget settings.

Vitrine aims to fill this gap: same philosophy (lightweight, self-hosted, widget-based) but with a visual drag-and-drop editor for layout and widget configuration, while keeping YAML import/export as an alternative for power users.

The preferred stack is Nuxt + Cloudflare (NuxtHub), consistent with the author's existing projects [Verbatims](https://verbatims.app) and [Zimablue](https://zimablue.com).

## Key Differentiators vs Glance

| Feature | Glance | Vitrine |
|---|---|---|
| Configuration | YAML files only | Visual UI editor + YAML import/export |
| Layout editing | Static YAML | Drag-and-drop grid editor |
| Widget config | YAML fields | In-UI forms per widget type |
| Plugin system | Built-in widgets only | Marketplace of installable plugins (long-term) |
| Deployment | Docker | Triple: Cloudflare (NuxtHub) + Docker + Umbrel app |
| Stack | Go + HTML templates | Nuxt 4 + Vue 3 + TypeScript |

## Tech Stack

- **Framework:** Nuxt 4 + Vue 3 + TypeScript
- **Styling:** UnoCSS + UnaUI
- **Drag-and-drop:** vue-draggable-plus or @dnd-kit (Vue adapter)
- **Cloudflare deployment:** NuxtHub (D1 for database, KV for config/layout cache)
- **Docker deployment:** SQLite + filesystem
- **Storage abstraction:** Interface-based adapter pattern (see Architecture)

## Architecture

### Triple Deployment — Storage Abstraction

The core architectural challenge is supporting three deployment targets with different storage backends. The solution is a storage abstraction layer:

```
┌─────────────────────────┐
│   Widget / Dashboard    │
│      Components         │
└────────────┬────────────┘
             │
     ┌───────▼────────┐
     │  Storage        │
     │  Interface      │
     │  (abstract)     │
     └──┬──────┬───────┘
        │      │
   ┌────▼───┐ ┌───▼────┐ ┌──────────┐
   │ Cloudflare │ │ Docker    │ │ Umbrel    │
   │ D1 + KV    │ │ SQLite +  │ │ SQLite +  │
   │            │ │ FS        │ │ Docker vol│
   └────────────┘ └──────────┘ └──────────┘
```

- **Cloudflare mode:** D1 stores dashboard configs, widget data, and plugin registry. KV caches layout snapshots and frequently accessed widget content.
- **Docker mode:** SQLite replaces D1, local filesystem replaces KV. Same interface, different implementation.
- **Umbrel mode:** Runs inside an Umbrel Docker container with persistent volumes for SQLite storage. Same interface, mounted via Docker volumes.
- **Nuxt modules pattern:** The right adapter is loaded automatically based on the runtime environment (Cloudflare Workers vs. Node.js). This is a well-established pattern in the Nuxt ecosystem (e.g., `hubStorage`, `hubDatabase` in NuxtHub).

### Widget System

Each widget is an isolated Vue component implementing a standard interface:

```ts
interface DashboardWidget {
  id: string
  type: string
  title: string
  config: Record<string, unknown>
  refreshInterval?: number  // in seconds
}
```

**Built-in widgets planned for MVP:**

- **RSS Feed** — fetch and display RSS/Atom feeds
- **Weather** — Open-Meteo API (no API key needed)
- **Clock** — analog/digital with timezone support
- **Quick Links** — configurable link grid
- **Markdown** — custom text/notes widget

## Roadmap

### Phase 1 — MVP (1-2 weeks)

- Dashboard grid layout (CSS Grid / UnoCSS)
- 3-4 basic widgets: RSS, weather, clock, links
- YAML import/export for dashboard config
- Static deployment (no persistence yet)
- Responsive design (mobile + desktop)

### Phase 2 — Visual Editor (1-2 weeks)

- Drag-and-drop layout editor (add/remove/reorder widgets)
- Widget configuration UI (forms, color picker, sizing)
- Theme system (light/dark + custom themes)
- Layout templates (predefined dashboard layouts)

### Phase 3 — Persistence (1 week)

- Storage abstraction layer
- Cloudflare adapter: D1 + NuxtHub KV
- Docker adapter: SQLite + filesystem
- Auto-save layout and config changes
- Dashboard state restore on reload

### Phase 4 — Plugin System (2-3 weeks)

- Plugin registry (manifest format, versioning)
- Plugin sandbox (security isolation for third-party widgets)
- In-app plugin browser and installer
- Plugin development documentation and SDK

### Phase 5 — Multi-user (1 week)

- Basic authentication (password or OAuth)
- Per-user dashboard layouts and preferences
- Shared/public dashboards option

### Estimated Effort

| Phase | Duration | Deliverable |
|---|---|---|
| MVP | 1-2 weeks | Functional dashboard with basic widgets |
| Visual Editor | 1-2 weeks | Drag-and-drop editing, themes |
| Persistence | 1 week | Cloudflare + Docker storage |
| Plugin System | 2-3 weeks | Marketplace UI, SDK, sandbox |
| Multi-user | 1 week | Auth, per-user layouts |

## Design Principles

- **Lightweight first** — no bloated dependencies, fast initial load
- **Visual by default** — every setting should be editable in the UI, YAML is optional
- **Deploy anywhere** — Cloudflare Workers, Docker, or Umbrel app, same codebase
- **Widget-centric** — each widget is self-contained, independent, shareable
- **Progressive complexity** — start simple, add features incrementally

## Links & References

- [Glance](https://github.com/glanceapp/glance) — inspiration source (Go, YAML-based, 34.8k ⭐)
- [NuxtHub](https://hub.nuxt.com) — Cloudflare deployment for Nuxt
- [vue-draggable-plus](https://github.com/Alfred-Skyblue/vue-draggable-plus) — Vue 3 drag-and-drop library
- [Open-Meteo](https://open-meteo.com) — free weather API (no key needed)
- [Verbatims](https://verbatims.app) — related Nuxt project by the same author
- [Zimablue](https://zimablue.com) — related Nuxt project by the same author

## License

TBD — likely MIT or Apache 2.0 for the core, with potential dual licensing for the marketplace.
