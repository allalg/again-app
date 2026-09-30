import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Filter, ArrowUpRight, Trophy, Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { calculateCompletionRate, formatDate, getDaysRemaining, getGradientForCategory, getCategoryEmoji } from '@/lib/utils'
import type { Challenge, ChallengeParticipant } from '@/lib/database.types'

const STATUS_OPTIONS = ['all', 'active', 'completed', 'paused', 'cancelled'] as const

export function HistoryPage() {
  const { user } = useAuthStore()
  const [filter, setFilter] = useState<typeof STATUS_OPTIONS[number]>('all')

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['history-challenges', user?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from('challenge_participants')
        .select(`
          *,
          challenge:challenges(*)
        `)
        .eq('user_id', user!.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })

      const { data } = await query
      const result = (data ?? [])
        .map((p) => ({
          participant: p as unknown as ChallengeParticipant,
          challenge: (p as any).challenge as Challenge,
        }))
        .filter((r) => r.challenge)
        .filter((r) => filter === 'all' || r.challenge.status === filter)

      return result
    },
    enabled: !!user,
  })

  return (
    <div className="page-container py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Challenge History</h1>
        <p className="text-muted-foreground text-sm">All challenges you've participated in</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-all border ${
              filter === s
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
      ) : challenges?.length === 0 ? (
        <div className="text-center py-16">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No challenges found</p>
          <p className="text-sm text-muted-foreground">
            {filter === 'all' ? 'Join or create a challenge to get started.' : `No ${filter} challenges yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges?.map(({ challenge, participant }) => {
            const gradient = getGradientForCategory(challenge.activity_category)
            const daysRemaining = getDaysRemaining(challenge.end_date)
            const daysElapsed = challenge.duration_days - daysRemaining
            const total = participant.total_completed_days + participant.total_missed_days
            const completionRate = calculateCompletionRate(
              participant.total_completed_days,
              Math.max(total, 1)
            )
            const timelineProgress = calculateCompletionRate(daysElapsed, challenge.duration_days)

            return (
              <Link key={challenge.id} to={`/challenges/${challenge.id}`}>
                <div className="challenge-card hover:shadow-md">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-lg shadow-md flex-shrink-0`}>
                          {getCategoryEmoji(challenge.activity_category)}
                        </div>
                        <div>
                          <h3 className="font-semibold leading-tight">{challenge.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(challenge.start_date, 'MMM d')} → {formatDate(challenge.end_date, 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant={challenge.status as any}>{challenge.status.replace('_', ' ')}</Badge>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <div className="font-bold flex items-center justify-center gap-1">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          {participant.longest_streak}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Best streak</div>
                      </div>
                      <div>
                        <div className="font-bold text-jade-600 dark:text-jade-400">
                          {participant.total_completed_days}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Days done</div>
                      </div>
                      <div>
                        <div className="font-bold text-primary">{completionRate}%</div>
                        <div className="text-[10px] text-muted-foreground">Completion</div>
                      </div>
                    </div>

                    <Progress value={completionRate} variant="jade" className="h-1" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
