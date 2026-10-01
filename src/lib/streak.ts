import { supabase } from './supabase'

export interface StreakStats {
  currentStreak: number
  longestStreak: number
  totalCompleted: number
  totalMissed: number
}

export function calculateStreakFromRecords(
  records: { challenge_day: string; status: string }[],
  todayStr?: string
): StreakStats {
  if (!todayStr) {
    todayStr = new Date().toISOString().split('T')[0]
  }

  const recordMap = new Map<string, string>()
  const completedDateSet = new Set<string>()
  let totalMissed = 0

  for (const r of records) {
    if (r.status === 'completed' || r.status === 'excused') {
      completedDateSet.add(r.challenge_day)
    }
    if (r.status === 'missed') {
      totalMissed++
    }
    // If multiple records for same day, 'completed' takes priority
    const existing = recordMap.get(r.challenge_day)
    if (!existing || r.status === 'completed' || r.status === 'excused') {
      recordMap.set(r.challenge_day, r.status)
    }
  }

  const totalCompleted = completedDateSet.size

  // Calculate current streak
  let currentStreak = 0
  const d = new Date(todayStr + 'T00:00:00Z')
  const todayStatus = recordMap.get(todayStr)
  const checkDate = new Date(d)

  if (todayStatus === 'completed' || todayStatus === 'excused') {
    currentStreak++
    checkDate.setUTCDate(checkDate.getUTCDate() - 1)
  } else {
    // Today not finished yet, check yesterday to preserve active streak
    checkDate.setUTCDate(checkDate.getUTCDate() - 1)
    const yDayStr = checkDate.toISOString().split('T')[0]
    const yStatus = recordMap.get(yDayStr)
    if (yStatus === 'completed' || yStatus === 'excused') {
      currentStreak++
      checkDate.setUTCDate(checkDate.getUTCDate() - 1)
    }
  }

  if (currentStreak > 0) {
    while (true) {
      const dayKey = checkDate.toISOString().split('T')[0]
      const status = recordMap.get(dayKey)
      if (status === 'completed' || status === 'excused') {
        currentStreak++
        checkDate.setUTCDate(checkDate.getUTCDate() - 1)
      } else {
        break
      }
    }
  }

  // Calculate longest streak
  const sortedDates = Array.from(completedDateSet).sort()
  let longestStreak = 0
  if (sortedDates.length > 0) {
    longestStreak = 1
    let currentRun = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1] + 'T00:00:00Z')
      const curr = new Date(sortedDates[i] + 'T00:00:00Z')
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        currentRun++
        if (currentRun > longestStreak) longestStreak = currentRun
      } else if (diffDays > 1) {
        currentRun = 1
      }
    }
  }
  longestStreak = Math.max(longestStreak, currentStreak)

  return {
    currentStreak,
    longestStreak,
    totalCompleted,
    totalMissed,
  }
}

/**
 * Synchronizes the user's streak in `challenge_participants` based on real `daily_challenge_records`.
 * Self-healing: if the database row was desynced or RPC failed, this updates `challenge_participants`
 * to the true value using the authenticated user's RLS permissions.
 */
export async function syncParticipantStreak(challengeId: string, userId: string): Promise<StreakStats | null> {
  try {
    // 1. Fetch all records for this user in this challenge
    const { data: records, error: recErr } = await supabase
      .from('daily_challenge_records')
      .select('challenge_day, status')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)

    if (recErr || !records) {
      console.warn('Could not fetch daily records for streak sync:', recErr)
      return null
    }

    const stats = calculateStreakFromRecords(records)

    // 2. Fetch current participant row
    const { data: part, error: partErr } = await supabase
      .from('challenge_participants')
      .select('current_streak, longest_streak, total_completed_days, total_missed_days')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .maybeSingle()

    if (partErr || !part) {
      return stats
    }

    const needsUpdate =
      part.current_streak !== stats.currentStreak ||
      part.total_completed_days !== stats.totalCompleted ||
      part.total_missed_days !== stats.totalMissed ||
      (part.longest_streak || 0) < stats.longestStreak

    if (needsUpdate) {
      await supabase
        .from('challenge_participants')
        .update({
          current_streak: stats.currentStreak,
          longest_streak: Math.max(stats.longestStreak, part.longest_streak || 0),
          total_completed_days: stats.totalCompleted,
          total_missed_days: stats.totalMissed,
          updated_at: new Date().toISOString(),
        })
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
    }

    return stats
  } catch (err) {
    console.error('Error syncing participant streak:', err)
    return null
  }
}
