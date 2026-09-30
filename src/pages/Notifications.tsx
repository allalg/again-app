import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2, Trophy, MessageCircle, DollarSign, UserPlus, Flame, ChevronRight, AlertTriangle, CheckCircle2, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import type { NotificationWithData, NotificationType } from '@/lib/database.types'

const NOTIFICATION_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  challenge_invite: { icon: Trophy, color: 'text-streak-500 bg-streak-500/10' },
  invite_accepted: { icon: CheckCheck, color: 'text-jade-500 bg-jade-500/10' },
  invite_rejected: { icon: Trash2, color: 'text-red-500 bg-red-500/10' },
  challenge_started: { icon: Flame, color: 'text-orange-500 bg-orange-500/10' },
  challenge_completed: { icon: Trophy, color: 'text-yellow-500 bg-yellow-500/10' },
  daily_reminder: { icon: Bell, color: 'text-blue-500 bg-blue-500/10' },
  deadline_approaching: { icon: Bell, color: 'text-red-500 bg-red-500/10' },
  deadline_missed: { icon: Flame, color: 'text-red-500 bg-red-500/10' },
  submission_received: { icon: Camera, color: 'text-streak-500 bg-streak-500/10' },
  submission_disputed: { icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
  submission_approved: { icon: CheckCircle2, color: 'text-jade-500 bg-jade-500/10' },
  new_message: { icon: MessageCircle, color: 'text-streak-500 bg-streak-500/10' },
  friend_request: { icon: UserPlus, color: 'text-blue-500 bg-blue-500/10' },
  friend_accepted: { icon: UserPlus, color: 'text-jade-500 bg-jade-500/10' },
  penalty_created: { icon: DollarSign, color: 'text-red-500 bg-red-500/10' },
  penalty_settled: { icon: DollarSign, color: 'text-jade-500 bg-jade-500/10' },
  payment_received: { icon: DollarSign, color: 'text-jade-500 bg-jade-500/10' },
}

export function NotificationsPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore()
  const queryClient = useQueryClient()

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    },
    onSuccess: (_, id) => {
      markAsRead(id)
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .is('read_at', null)
    },
    onSuccess: () => {
      markAllAsRead()
    },
  })

  const handleNotificationClick = (notification: NotificationWithData) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }

    if (notification.type === 'challenge_invite' && notification.data?.challenge_id) {
      navigate(`/challenges/${notification.data.challenge_id}`)
    } else if (notification.type === 'submission_disputed' && notification.data?.challenge_id) {
      navigate(`/challenges/${notification.data.challenge_id}/submit`)
    } else if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      navigate('/friends')
    } else if (notification.type === 'new_message' && notification.data?.challenge_id) {
      navigate(`/challenges/${notification.data.challenge_id}/chat`)
    } else if (notification.data?.challenge_id) {
      navigate(`/challenges/${notification.data.challenge_id}`)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <div className="page-container py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            loading={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">All caught up!</h2>
          <p className="text-muted-foreground">No notifications yet. Start a challenge to get activity here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notifications.map((notification, i) => {
            const config = NOTIFICATION_ICONS[notification.type] ?? NOTIFICATION_ICONS.daily_reminder
            const Icon = config.icon
            const isUnread = !notification.read_at

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleNotificationClick(notification)}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all hover:border-border/80 group ${
                  isUnread
                    ? 'bg-primary/5 border-primary/20 hover:bg-primary/8'
                    : 'bg-card border-border hover:bg-accent/30'
                }`}
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
                {isUnread && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
