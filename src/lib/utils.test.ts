import { describe, it, expect } from 'vitest'
import {
  cn,
  calculateCompletionRate,
  calculateCurrentStreak,
  formatCurrency,
  distributeEqually,
  initials,
  validateImageFile,
} from './utils'

describe('UI Utilities - cn', () => {
  it('combines classes properly', () => {
    expect(cn('px-4', 'py-2', 'bg-primary')).toBe('px-4 py-2 bg-primary')
  })

  it('merges tailwind conflicts correctly', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('handles conditional and falsy inputs', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'visible')).toBe('base visible')
  })
})

describe('Challenge Calculations', () => {
  it('calculates completion rate percentage', () => {
    expect(calculateCompletionRate(0, 0)).toBe(0)
    expect(calculateCompletionRate(45, 90)).toBe(50)
    expect(calculateCompletionRate(90, 90)).toBe(100)
    expect(calculateCompletionRate(1, 3)).toBe(33)
  })

  it('calculates current streak across daily records', () => {
    const days = [
      { challenge_day: '2026-09-29', status: 'completed' },
      { challenge_day: '2026-09-28', status: 'completed' },
      { challenge_day: '2026-09-27', status: 'excused' },
      { challenge_day: '2026-09-26', status: 'missed' },
      { challenge_day: '2026-09-25', status: 'completed' },
    ]
    expect(calculateCurrentStreak(days)).toBe(3)
  })

  it('handles empty days array', () => {
    expect(calculateCurrentStreak([])).toBe(0)
  })
})

describe('Financial Utilities', () => {
  it('formats currency correctly', () => {
    expect(formatCurrency(25, 'USD')).toBe('$25.00')
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
    expect(formatCurrency(1250.5, 'USD')).toBe('$1,250.50')
  })

  it('distributes penalty equally among recipients with remainder handling', () => {
    expect(distributeEqually(10, 0)).toEqual([])
    
    const split2 = distributeEqually(10, 2)
    expect(split2).toEqual([5, 5])
    expect(split2.reduce((a, b) => a + b, 0)).toBe(10)

    // 10 split 3 ways -> 3.34, 3.33, 3.33
    const split3 = distributeEqually(10, 3)
    expect(split3.length).toBe(3)
    const total = Math.round(split3.reduce((a, b) => a + b, 0) * 100) / 100
    expect(total).toBe(10)
  })
})

describe('String and Avatar Utilities', () => {
  it('extracts user initials correctly', () => {
    expect(initials('Alex Morgan')).toBe('AM')
    expect(initials('Single')).toBe('S')
    expect(initials('John Michael Doe')).toBe('JM')
    expect(initials('')).toBe('U')
  })

  it('validates file size and image mime types', () => {
    const validFile = new File(['mock content'], 'photo.jpg', { type: 'image/jpeg' })
    expect(validateImageFile(validFile).valid).toBe(true)

    const invalidType = new File(['data'], 'script.js', { type: 'application/javascript' })
    expect(validateImageFile(invalidType).valid).toBe(false)
    expect(validateImageFile(invalidType).error).toContain('JPEG')
  })
})
