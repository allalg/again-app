import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, getDay, parseISO, isToday
} from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { UserAvatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { DailyStatus, Profile } from '@/lib/database.types'

const STATUS_COLORS: Record<DailyStatus, string> = {
  completed: 'calendar-day-completed',
  missed: 'calendar-day-missed',
  submitted: 'bg-blue-500/70 text-white',
  pending: 'calendar-day-pending',
  incomplete: 'bg-orange-500/70 text-white',
  disputed: 'bg-orange-500/80 text-white',
  excused: 'calendar-day-excused',
}

export function ChallengeCalendarPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(user?.id ?? null)

  const { data: challenge } = useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenges')
        .select('*, participants:challenge_participants(*, profile:profiles!user_id(id, username, display_name, avatar_url))')
        .eq('id', id!)
        .single()
      return data
    },
    enabled: !!id,
  })

  const { data: records } = useQuery({
    queryKey: ['calendar-records', id, selectedParticipant],
    queryFn: async () => {
      let query = supabase
        .from('daily_challenge_records')
        .select('*')
        .eq('challenge_id', id!)
        .order('challenge_day')

      if (selectedParticipant) {
        query = query.eq('user_id', selectedParticipant)
      }

      const { data } = await query
      return data ?? []
    },
    enabled: !!id,
  })

  const recordsByDay = (records ?? []).reduce<Record<string, DailyStatus>>((acc, r) => {
    acc[r.challenge_day] = r.status as DailyStatus
    return acc
  }, {})

  const participants = (challenge?.participants as any[])?.filter((p: any) => p.status === 'accepted') ?? []

  // Calendar grid
  const monthStart = startOfMonth(selectedMonth)
  const monthEnd = endOfMonth(selectedMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = getDay(monthStart) // 0=Sun

  // Stats for selected participant
  const allRecords = records ?? []
  const completed = allRecords.filter((r) => r.status === 'completed').length
  const missed = allRecords.filter((r) => r.status === 'missed').length
  const total = allRecords.filter((r) => !['pending'].includes(r.status)).length

  return (
    <div className="page-container py-6 max-w-3xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back to Challenge
      </button>

      <div>
        <h1 className="text-2xl font-bold">Progress Calendar</h1>
        <p className="text-muted-foreground text-sm">{challenge?.title}</p>
      </div>

      {/* Participant selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {participants.map((p: any) => {
          const profile = p.profile as Profile
          return (
            <button
              key={p.user_id}
              onClick={() => setSelectedParticipant(p.user_id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition-all',
                selectedParticipant === p.user_id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <UserAvatar src={profile.avatar_url} name={profile.display_name} size="xs" />
              {profile.display_name}
              {p.user_id === user?.id && ' (me)'}
            </button>
          )
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Completed', value: completed, color: 'text-jade-500' },
          { label: 'Missed', value: missed, color: 'text-red-500' },
          { label: 'Rate', value: `${total > 0 ? Math.round(completed / total * 100) : 0}%`, color: 'text-primary' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button
            onClick={() => setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="font-semibold">{format(selectedMonth, 'MMMM yyyy')}</h2>
          <button
            onClick={() => setSelectedMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Padding cells */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const status = recordsByDay[dateStr]
              const today = isToday(day)

              return (
                <div
                  key={dateStr}
                  className={cn(
                    'calendar-day',
                    status ? STATUS_COLORS[status] : 'text-foreground hover:bg-accent',
                    today && 'calendar-day-today'
                  )}
                  title={status ? `${dateStr}: ${status}` : dateStr}
                >
                  {format(day, 'd')}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-4 border-t border-border">
            {[
              { color: 'bg-jade-500', label: 'Completed' },
              { color: 'bg-red-500/80', label: 'Missed' },
              { color: 'bg-blue-500/70', label: 'Submitted' },
              { color: 'bg-yellow-500/20 border border-yellow-500/40', label: 'Pending' },
              { color: 'bg-purple-500/20', label: 'Excused' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`h-3 w-3 rounded-sm ${color}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
