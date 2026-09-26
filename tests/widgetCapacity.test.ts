import { describe, expect, it } from 'vitest'
import { countFittingItems } from '../shared/utils/widgetCapacity'

describe('countFittingItems', () => {
  it('counts items that fit fully, allowing subpixel layout rounding', () => {
    expect(countFittingItems(300, [180, 300.4, 301.2, 420])).toBe(2)
  })

  it('supports a list arranged in multiple rows', () => {
    expect(countFittingItems(250, [120, 120, 245, 245, 280, 280])).toBe(4)
  })

  it('returns zero for invalid bounds or negative tolerance', () => {
    expect(countFittingItems(Number.NaN, [10])).toBe(0)
    expect(countFittingItems(10, [10], -1)).toBe(0)
  })
})
