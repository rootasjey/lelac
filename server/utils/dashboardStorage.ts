export interface StoredDashboardRow {
  dashboard_id: string
  config_json: string
}

export interface StoredDashboardDefinitionRow {
  dashboard_id: string
  title: string
  position: number
}

export interface DashboardWrite {
  id: string
  config: unknown
}

export function loadDashboardRows(db: Cloudflare.Env['DB'], userId: string) {
  return db.prepare('SELECT dashboard_id, config_json FROM dashboards WHERE user_id = ?')
    .bind(userId).all<StoredDashboardRow>()
}

export function loadDashboardDefinitions(db: Cloudflare.Env['DB'], userId: string) {
  return db.prepare('SELECT dashboard_id, title, position FROM dashboard_definitions WHERE user_id = ? ORDER BY position ASC')
    .bind(userId).all<StoredDashboardDefinitionRow>()
}

export function saveDashboardRows(db: Cloudflare.Env['DB'], userId: string, entries: DashboardWrite[], updatedAt = new Date().toISOString()) {
  return db.batch(entries.map(({ id, config }) => db.prepare(`
    INSERT INTO dashboards (user_id, dashboard_id, config_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, dashboard_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at
  `).bind(userId, id, JSON.stringify(config), updatedAt)))
}

export function saveDashboardCollection(db: Cloudflare.Env['DB'], userId: string, entries: Array<DashboardWrite & { title: string; position: number }>, updatedAt = new Date().toISOString()) {
  const statements = [
    db.prepare('DELETE FROM dashboards WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM dashboard_definitions WHERE user_id = ?').bind(userId),
  ]
  for (const entry of entries) {
    statements.push(
      db.prepare('INSERT INTO dashboard_definitions (user_id, dashboard_id, title, position, updated_at) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, entry.id, entry.title, entry.position, updatedAt),
      db.prepare('INSERT INTO dashboards (user_id, dashboard_id, config_json, updated_at) VALUES (?, ?, ?, ?)')
        .bind(userId, entry.id, JSON.stringify(entry.config), updatedAt),
    )
  }
  return db.batch(statements)
}
