import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Trophy, Flame, Crown, Medal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { UserAvatar } from '@/components/ui/Avatar'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { calculateCompletionRate, formatCurrency } from '@/lib/utils'
import { calculateStreakFromRecords } from '@/lib/streak'

export function LeaderboardPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const { data: allRecords } = useQuery({
    queryKey: ['leaderboard-records', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_challenge_records')
        .select('user_id, challenge_day, status')
        .eq('challenge_id', id!)
      return data ?? []
    },
    enabled: !!id,
  })

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          profile:profiles!user_id(id, username, display_name, avatar_url),
          challenge:challenges(daily_target_value, daily_target_unit, duration_days, start_date, currency, fine_amount)
        `)
        .eq('challenge_id', id!)
        .eq('status', 'accepted')
        .order('total_completed_days', { ascending: false })
      return data ?? []
    },
    enabled: !!id,
  })

  const { data: challenge } = useQuery({
    queryKey: ['challenge-meta', id],
    queryFn: async () => {
      const { data } = await supabase.from('challenges').select('title, currency').eq('id', id!).single()
      return data
    },
    enabled: !!id,
  })

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />
    return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
  }

  const maxCompleted = Math.max(...(leaderboard ?? []).map((p) => p.total_completed_days), 1)

  return (
    <div className="page-container py-6 max-w-2xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground text-sm">{challenge?.title}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard?.map((participant, index) => {
            const rank = index + 1
            const profile = participant.profile as any
            const isMe = participant.user_id === user?.id
            const pRecords = allRecords?.filter((r) => r.user_id === participant.user_id) || []
            const pStats = calculateStreakFromRecords(pRecords)
            const streak = Math.max(participant.current_streak || 0, pStats.currentStreak)
            const completedDays = Math.max(participant.total_completed_days || 0, pStats.totalCompleted)
            const missedDays = Math.max(participant.total_missed_days || 0, pStats.totalMissed)
            const total = completedDays + missedDays
            const completionRate = calculateCompletionRate(completedDays, Math.max(total, 1))
            const barWidth = Math.round((completedDays / maxCompleted) * 100)

            return (
              <div
                key={participant.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  isMe
                    ? 'border-primary/40 bg-primary/5 shadow-[0_0_20px_rgba(124,58,237,0.1)]'
                    : 'border-border bg-card hover:border-border/80'
                } ${rank <= 3 ? 'shadow-sm' : ''}`}
              >
                {/* Rank */}
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(rank)}
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <UserAvatar
                    src={profile?.avatar_url}
                    name={profile?.display_name ?? 'User'}
                    size={rank <= 3 ? 'md' : 'sm'}
                  />
                  {rank === 1 && (
                    <span className="absolute -top-1.5 -right-1.5 text-lg">👑</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{profile?.display_name}</p>
                    {isMe && <Badge variant="streak" className="text-[10px] py-0">You</Badge>}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>🔥 {streak} streak</span>
                    <span>✅ {completedDays} days</span>
                    <span>📈 {completionRate}%</span>
                  </div>

                  {/* Bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' :
                        rank === 2 ? 'bg-gradient-to-r from-slate-300 to-slate-400' :
                        rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                        'bg-gradient-streak'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>

                {/* Penalty stats */}
                <div className="text-right flex-shrink-0">
                  {participant.total_penalties_received > 0 && (
                    <div className="text-xs text-jade-500 font-semibold">
                      +{formatCurrency(participant.total_penalties_received, challenge?.currency ?? 'USD')}
                    </div>
                  )}
                  {participant.total_penalties_owed > 0 && (
                    <div className="text-xs text-red-500 font-semibold">
                      -{formatCurrency(participant.total_penalties_owed, challenge?.currency ?? 'USD')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
