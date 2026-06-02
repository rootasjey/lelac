export interface WidgetConfig {
  type: string
  title: string
  [key: string]: unknown
}

export interface ColumnConfig {
  size: 'small' | 'medium' | 'large'
  widgets: WidgetConfig[]
}

export interface PageConfig {
  name: string
  columns: ColumnConfig[]
}

export interface DashboardConfig {
  title?: string
  theme?: 'light' | 'dark' | 'system'
  pages: PageConfig[]
}

export const SIZES = {
  small: '1fr',
  medium: '1.5fr',
  large: '2fr',
} as const
