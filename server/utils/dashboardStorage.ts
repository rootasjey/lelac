export interface StoredDashboardRow {
  dashboard_id: string
  config_json: string
}

export interface DashboardWrite {
  id: string
  config: unknown
}

export function loadDashboardRows(db: Cloudflare.Env['DB'], userId: string) {
  return db.prepare('SELECT dashboard_id, config_json FROM dashboards WHERE user_id = ?')
    .bind(userId).all<StoredDashboardRow>()
}

export function saveDashboardRows(db: Cloudflare.Env['DB'], userId: string, entries: DashboardWrite[], updatedAt = new Date().toISOString()) {
  return db.batch(entries.map(({ id, config }) => db.prepare(`
    INSERT INTO dashboards (user_id, dashboard_id, config_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, dashboard_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at
  `).bind(userId, id, JSON.stringify(config), updatedAt)))
}
