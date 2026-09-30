import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Flame, Trophy, DollarSign, Clock, Plus, ArrowRight,
  Camera, CheckCircle2, AlertCircle, Zap, UserPlus, Check, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { UserAvatar } from '@/components/ui/Avatar'
import { MobileStreakWidget } from '@/components/ui/MobileStreakWidget'
import { toast } from '@/components/ui/Toaster'
import {
  formatDate, formatCurrency, getDaysRemaining, calculateCompletionRate,
  getGradientForCategory, getCategoryEmoji, getDayLabel, isDeadlinePast, cn
} from '@/lib/utils'
import type { Challenge, ChallengeParticipant, DailyChallengeRecord } from '@/lib/database.types'

interface DashboardChallenge extends Challenge {
  my_participant: ChallengeParticipant
  today_record?: DailyChallengeRecord
  participant_count: number
}

export function DashboardPage() {
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()

  // Fetch active challenges for the current user
  const { data: challenges, isLoading } = useQuery({
    queryKey: ['dashboard-challenges', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: participants, error } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          challenge:challenges(*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')

      if (error) {
        console.error('Failed to load challenges:', error)
        return []
      }

      // For each challenge, fetch today's record
      const today = new Date().toISOString().split('T')[0]
      const results: DashboardChallenge[] = []

      for (const p of participants ?? []) {
        const challenge = p.challenge as unknown as Challenge
        if (!challenge || !['active', 'paused', 'pending_acceptance'].includes(challenge.status)) continue

        const { data: todayRecord } = await supabase
          .from('daily_challenge_records')
          .select('*')
          .eq('challenge_id', challenge.id)
          .eq('user_id', user.id)
          .eq('challenge_day', today)
          .single()

        const { count } = await supabase
          .from('challenge_participants')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', challenge.id)
          .eq('status', 'accepted')

        results.push({
          ...challenge,
          my_participant: p as unknown as ChallengeParticipant,
          today_record: todayRecord ?? undefined,
          participant_count: count ?? 0,
        })
      }

      return results
    },
    enabled: !!user,
  })

  // Fetch outstanding penalties
  const { data: penalties } = useQuery({
    queryKey: ['my-penalties', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('penalties')
        .select('amount, currency')
        .eq('payer_id', user!.id)
        .eq('status', 'pending')
      return data ?? []
    },
    enabled: !!user,
  })

  const totalPendingPenalties = penalties?.reduce((sum, p) => sum + p.amount, 0) ?? 0

  // Aggregate stats
  const stats = {
    activeChallenges: challenges?.length ?? 0,
    currentStreak: challenges?.reduce((max, c) => Math.max(max, c.my_participant.current_streak), 0) ?? 0,
    completionRate: challenges?.length
      ? Math.round(
          challenges.reduce((sum, c) => {
            const total = c.my_participant.total_completed_days + c.my_participant.total_missed_days
            return sum + (total > 0 ? c.my_participant.total_completed_days / total : 0)
          }, 0) / challenges.length * 100
        )
      : 0,
    pendingPenalties: totalPendingPenalties,
  }

  const queryClient = useQueryClient()

  // Fetch pending invitations for current user
  const { data: pendingInvites, refetch: refetchPendingInvites } = useQuery({
    queryKey: ['pending-invites', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          id,
          challenge_id,
          status,
          challenge:challenges (
            id,
            title,
            activity_name,
            activity_category,
            daily_target_value,
            daily_target_unit,
            duration_days,
            fine_amount,
            currency,
            invitation_link_token,
            creator:profiles!creator_id (
              display_name,
              avatar_url,
              username
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'invited')

      if (error) {
        console.error('Error fetching pending invites:', error)
        return []
      }
      return data ?? []
    },
    enabled: !!user,
  })

  const acceptInvite = useMutation({
    mutationFn: async ({ participantId, challengeId }: { participantId: string; challengeId: string }) => {
      const { error } = await supabase
        .from('challenge_participants')
        .update({
          status: 'accepted',
          rule_version_accepted: 1,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', participantId)
      if (error) throw error
      return challengeId
    },
    onSuccess: (challengeId) => {
      toast({ title: 'Challenge accepted! 🎉', description: "You're now part of the challenge!" })
      refetchPendingInvites()
      queryClient.invalidateQueries({ queryKey: ['dashboard-challenges'] })
      navigate(`/challenges/${challengeId}`)
    },
    onError: (err: any) => {
      toast({ title: 'Failed to accept', description: err.message, variant: 'destructive' })
    },
  })

  const declineInvite = useMutation({
    mutationFn: async (participantId: string) => {
      const { error } = await supabase
        .from('challenge_participants')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', participantId)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Invitation declined' })
      refetchPendingInvites()
    },
  })

  const todayPending = challenges?.filter(
    (c) => !c.today_record || c.today_record.status === 'pending' || c.today_record.status === 'disputed'
  ) ?? []

  return (
    <div className="page-container py-8 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cinnabar-600 dark:text-cinnabar-400 block mb-1">
            TODAY'S OVERVIEW • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-foreground leading-tight">
            Good {getTimeOfDay()}, {profile?.display_name?.split(' ')[0] ?? 'Challenger'}
          </h1>
          <p className="font-serif italic text-muted-foreground text-sm mt-1">
            {todayPending.length > 0
              ? `${todayPending.length} challenge${todayPending.length > 1 ? 's' : ''} awaiting today's proof`
              : 'All daily streaks completed today! Keep the momentum.'}
          </p>
        </div>
        <Button variant="cinnabar" size="sm" asChild>
          <Link to="/challenges/new" className="font-cinzel text-xs tracking-wider uppercase gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create Challenge
          </Link>
        </Button>
      </div>

      {/* Mobile Streak Widget with 1-Tap Quick Upload & Add to Home Screen */}
      <MobileStreakWidget
        currentStreak={stats.currentStreak}
        totalChallenges={challenges?.length ?? 0}
        pendingCount={todayPending.length}
        firstPendingId={todayPending[0]?.id}
        firstPendingTitle={todayPending[0]?.title}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Challenges"
          value={stats.activeChallenges}
          icon={Zap}
          accent="text-cinnabar-600 dark:text-cinnabar-400"
          suffix=""
        />
        <StatCard
          label="Current Streak"
          value={stats.currentStreak}
          icon={Flame}
          accent="text-gilt-600 dark:text-gilt-400"
          suffix=" Days"
        />
        <StatCard
          label="Completion Rate"
          value={stats.completionRate}
          icon={Trophy}
          accent="text-botanical-600 dark:text-botanical-400"
          suffix="%"
        />
        <StatCard
          label="Pending Fines"
          value={totalPendingPenalties > 0 ? formatCurrency(totalPendingPenalties) : 'None'}
          icon={DollarSign}
          accent="text-cinnabar-600 dark:text-cinnabar-400"
          isString={totalPendingPenalties === 0}
          suffix=""
        />
      </div>

      {/* Pending Challenge Invitations */}
      {pendingInvites && pendingInvites.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-streak-500" />
            <h2 className="font-semibold text-sm uppercase tracking-wide text-streak-500">
              Pending Challenge Invitations ({pendingInvites.length})
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {pendingInvites.map((inv: any) => {
              const ch = inv.challenge
              if (!ch) return null
              const gradient = getGradientForCategory(ch.activity_category)
              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-streak-500/30 bg-streak-500/5 p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-streak-500/50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-xl shadow flex-shrink-0`}>
                      {getCategoryEmoji(ch.activity_category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm line-clamp-1">{ch.title}</span>
                        <Badge variant="pending">Invited</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ch.creator?.display_name || 'A friend'} invited you · {ch.duration_days} days ({ch.daily_target_value} {ch.daily_target_unit}/day)
                      </p>
                      {ch.fine_amount > 0 && (
                        <p className="text-[11px] text-red-500 font-medium mt-1">
                          Stake: {formatCurrency(ch.fine_amount, ch.currency)} per missed day
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground h-8"
                      onClick={() => declineInvite.mutate(inv.id)}
                      loading={declineInvite.isPending}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="streak"
                      className="text-xs h-8"
                      onClick={() => acceptInvite.mutate({ participantId: inv.id, challengeId: ch.id })}
                      loading={acceptInvite.isPending}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Accept & Join
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's tasks */}
      {todayPending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Due Today
            </h2>
          </div>
          <div className="space-y-2">
            {todayPending.map((challenge) => (
              <TodayCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </div>
      )}

      {/* Active challenges */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Active Challenges</h2>
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-48 rounded-2xl" />
            ))}
          </div>
        ) : challenges?.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {challenges?.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <ChallengeCard challenge={challenge} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ======================== Sub-components ========================

function StatCard({
  label, value, icon: Icon, accent, suffix, isString
}: {
  label: string
  value: number | string
  icon: React.ElementType
  accent: string
  suffix: string
  isString?: boolean
}) {
  return (
    <div className="stat-card bg-card/60 border border-border/80 p-5 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <span className="font-cinzel text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4", accent)} />
      </div>
      <div className="font-serif text-3xl font-normal text-foreground tracking-tight">
        {isString ? 'NIL' : value}{!isString && <span className="text-base font-serif italic text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

function TodayCard({ challenge }: { challenge: DashboardChallenge }) {
  const isDisputed = challenge.today_record?.status === 'disputed'
  const isPastDeadline = challenge.today_record
    ? isDeadlinePast(challenge.today_record.deadline_utc)
    : false

  return (
    <Link to={`/challenges/${challenge.id}/submit`}>
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-sm",
        isDisputed
          ? 'bg-cinnabar-500/10 border-cinnabar-500/30 hover:border-cinnabar-500/50'
          : isPastDeadline
          ? 'bg-cinnabar-500/5 border-cinnabar-500/20 hover:border-cinnabar-500/40'
          : 'bg-card/70 border-border/80 hover:border-primary/50'
      )}>
        <div className="text-2xl p-2 rounded-md bg-muted/40 border border-border/60">
          {getCategoryEmoji(challenge.activity_category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-serif font-semibold text-base text-foreground truncate">{challenge.title}</p>
            {isDisputed && <Badge variant="disputed">Needs Revision</Badge>}
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">
            {isDisputed
              ? '⚠️ Evidence was contested · Resubmit to preserve pact'
              : `Target: ${challenge.daily_target_value} ${challenge.daily_target_unit}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDisputed ? (
            <Badge variant="destructive" className="font-cinzel text-[10px] tracking-wider uppercase">Retry Evidence 🔄</Badge>
          ) : isPastDeadline ? (
            <Badge variant="missed">Overdue</Badge>
          ) : (
            <Badge variant="stamp">Submit Proof</Badge>
          )}
          <Camera className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}

function ChallengeCard({ challenge }: { challenge: DashboardChallenge }) {
  const daysRemaining = getDaysRemaining(challenge.end_date)
  const daysElapsed = challenge.duration_days - daysRemaining
  const progress = calculateCompletionRate(daysElapsed, challenge.duration_days)
  const completionRate = calculateCompletionRate(
    challenge.my_participant.total_completed_days,
    Math.max(1, daysElapsed)
  )

  return (
    <Link to={`/challenges/${challenge.id}`}>
      <div className="exhibition-card p-5 space-y-4">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-muted/50 border border-border/70 flex items-center justify-center text-lg flex-shrink-0">
              {getCategoryEmoji(challenge.activity_category)}
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold leading-tight line-clamp-1 text-foreground">
                {challenge.title}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
                {challenge.daily_target_value} {challenge.daily_target_unit} / day
              </p>
            </div>
          </div>
          <Badge variant={challenge.status === 'active' ? 'active' : 'paused'}>
            {challenge.status}
          </Badge>
        </div>

        {/* Progress Timeline */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>Day {daysElapsed} of {challenge.duration_days}</span>
            <span>{daysRemaining} days remaining</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
          <div className="text-center">
            <div className="font-serif text-base font-bold text-foreground">
              {challenge.my_participant.current_streak} D
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Streak</div>
          </div>
          <div className="text-center">
            <div className="font-serif text-base font-bold text-foreground">
              {completionRate}%
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Fidelity</div>
          </div>
          <div className="text-center">
            <div className="font-serif text-base font-bold text-foreground">
              {challenge.participant_count}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Fellows</div>
          </div>
        </div>

        {/* Today status */}
        <TodayStatus challenge={challenge} />
      </div>
    </Link>
  )
}

function TodayStatus({ challenge }: { challenge: DashboardChallenge }) {
  const record = challenge.today_record
  if (!record) return null

  const statusConfig: Record<string, { color: string; label: string; icon: React.ElementType }> = {
    completed: { color: 'text-botanical-600 dark:text-botanical-400', label: 'Verified today', icon: CheckCircle2 },
    submitted: { color: 'text-stone-600 dark:text-stone-300', label: 'Submitted — awaiting review', icon: Clock },
    missed: { color: 'text-cinnabar-600 dark:text-cinnabar-400', label: 'Missed today', icon: AlertCircle },
    pending: { color: 'text-gilt-600 dark:text-gilt-400', label: 'Pending submission', icon: Camera },
  }

  const config = statusConfig[record.status] ?? statusConfig.pending
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-1.5 font-mono text-[11px] ${config.color} font-medium pt-2 border-t border-border/60`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 rounded-xl bg-card/30 p-8">
      <div className="text-4xl mb-3">🔥</div>
      <h3 className="font-serif text-2xl font-normal text-foreground mb-2">No Active Challenges</h3>
      <p className="font-serif italic text-muted-foreground text-sm mb-6 max-w-sm">
        Start your first 90-day streak with friends and build your daily habits again and again.
      </p>
      <Button variant="cinnabar" asChild>
        <Link to="/challenges/new" className="font-cinzel text-xs tracking-wider uppercase gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Create Your First Challenge
        </Link>
      </Button>
    </div>
  )
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
