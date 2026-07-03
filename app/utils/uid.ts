let counter = 0

export function uid(): string {
  counter++
  return `widget-${counter}-${Date.now()}`
}
