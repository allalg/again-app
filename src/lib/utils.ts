import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =====================================================================
// DATE / TIME UTILITIES
// =====================================================================

export function formatDate(date: string | Date, pattern = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern)
}

export function formatRelativeTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatDateInTz(date: string | Date, timezone: string, pattern = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  const zoned = toZonedTime(d, timezone)
  return format(zoned, pattern)
}

export function getNowInTz(timezone: string) {
  return toZonedTime(new Date(), timezone)
}

export function getDeadlineUtc(date: string, time: string, timezone: string): Date {
  const dateTimeStr = `${date}T${time}`
  return fromZonedTime(new Date(dateTimeStr), timezone)
}

export function getDaysRemaining(endDate: string) {
  const end = parseISO(endDate)
  const today = new Date()
  return Math.max(0, differenceInDays(end, today))
}

export function getDayLabel(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEE, MMM d')
}

export function formatDeadline(deadlineUtc: string, userTimezone: string) {
  const d = parseISO(deadlineUtc)
  const zoned = toZonedTime(d, userTimezone)
  return format(zoned, 'h:mm a')
}

export function isDeadlinePast(deadlineUtc: string) {
  return new Date() > parseISO(deadlineUtc)
}

// =====================================================================
// CHALLENGE UTILITIES
// =====================================================================

export function calculateCompletionRate(completed: number, total: number) {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function calculateCurrentStreak(days: { status: string; challenge_day: string }[]) {
  const sorted = [...days].sort((a, b) => b.challenge_day.localeCompare(a.challenge_day))
  let streak = 0
  for (const day of sorted) {
    if (day.status === 'completed' || day.status === 'excused') {
      streak++
    } else if (day.status !== 'pending') {
      break
    }
  }
  return streak
}

// =====================================================================
// FINANCIAL UTILITIES
// =====================================================================

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function distributeEqually(totalAmount: number, recipientCount: number) {
  if (recipientCount === 0) return []
  const share = Math.floor((totalAmount / recipientCount) * 100) / 100
  const remainder = totalAmount - share * recipientCount
  return Array.from({ length: recipientCount }, (_, i) =>
    i === 0 ? share + Math.round(remainder * 100) / 100 : share
  )
}

// =====================================================================
// FILE UTILITIES
// =====================================================================

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not supported. Use JPEG, PNG, WebP or HEIC.` }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File size ${formatFileSize(file.size)} exceeds the ${MAX_FILE_SIZE_MB}MB limit.` }
  }
  return { valid: true }
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function generateStoragePath(challengeId: string, userId: string, fileName: string) {
  const ext = fileName.split('.').pop()
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${challengeId}/${userId}/${timestamp}_${random}.${ext}`
}

// =====================================================================
// STRING UTILITIES
// =====================================================================

export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 3)}...`
}

export function initials(name: string) {
  if (!name) return 'U'
  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
  return letters || 'U'
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// =====================================================================
// VALIDATION
// =====================================================================

export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/

export function validateUsername(username: string): string | null {
  if (!USERNAME_REGEX.test(username)) {
    return 'Username must be 3-30 characters and contain only letters, numbers and underscores'
  }
  return null
}

// =====================================================================
// MISC
// =====================================================================

export function generateInviteToken() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`)
}

export function getGradientForCategory(category: string) {
  const gradients: Record<string, string> = {
    fitness: 'from-orange-500 to-red-500',
    mindfulness: 'from-purple-500 to-indigo-500',
    learning: 'from-blue-500 to-cyan-500',
    health: 'from-green-500 to-teal-500',
    creative: 'from-pink-500 to-rose-500',
    social: 'from-yellow-500 to-orange-500',
    productivity: 'from-indigo-500 to-blue-500',
    nutrition: 'from-lime-500 to-green-500',
    sleep: 'from-violet-500 to-purple-500',
    custom: 'from-streak-500 to-blue-500',
  }
  return gradients[category] ?? gradients.custom
}

export function getCategoryEmoji(category: string) {
  const emojis: Record<string, string> = {
    fitness: '🏃',
    mindfulness: '🧘',
    learning: '📚',
    health: '💪',
    creative: '🎨',
    social: '👥',
    productivity: '⚡',
    nutrition: '🥗',
    sleep: '😴',
    custom: '✨',
  }
  return emojis[category] ?? '✨'
}

export function noop() {}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =====================================================================
// LINK & GITHUB REPO UTILITIES
// =====================================================================

export function extractUrl(text?: string | null): string | null {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s<>"'{}|\\^`[\]]+/i)
  if (!match) return null
  // Strip trailing punctuation like .,:;)
  return match[0].replace(/[.,:;)]+$/, '')
}

export function isGithubUrl(url?: string | null): boolean {
  if (!url) return false
  return /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i.test(url)
}

export function parseGithubRepoName(url?: string | null): string | null {
  if (!url) return null
  try {
    const raw = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(raw)
    if (parsed.hostname.includes('github.com')) {
      const parts = parsed.pathname.split('/').filter(Boolean)
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`
      }
    }
  } catch {
    const match = url.match(/github\.com\/([^/\s]+)\/([^/?#\s]+)/i)
    if (match) return `${match[1]}/${match[2]}`
  }
  return null
}

export function cleanNotesWithoutUrl(notes?: string | null, url?: string | null): string {
  if (!notes) return ''
  if (!url) return notes.trim()
  return notes
    .replace(new RegExp(`🔗?\\s*${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '')
    .trim()
}

