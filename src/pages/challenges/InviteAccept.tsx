import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toaster'
import { formatCurrency, formatDate, getGradientForCategory, getCategoryEmoji } from '@/lib/utils'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>()
  const { user, isInitialized } = useAuthStore()
  const navigate = useNavigate()
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['invite', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!creator_id(id, display_name, avatar_url, username),
          participants:challenge_participants(
            user_id, status,
            profile:profiles!user_id(id, display_name, avatar_url)
          )
        `)
        .eq('invitation_link_token', token!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!token,
  })

  if (!isInitialized) return <LoadingScreen />

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-4xl">🔒</div>
          <h1 className="text-2xl font-bold">Sign in to join</h1>
          <p className="text-muted-foreground">Create an account or log in to accept this challenge invitation.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="streak" onClick={() => navigate(`/signup?redirect=/invite/${token}`)}>
              Sign Up Free
            </Button>
            <Button variant="outline" onClick={() => navigate(`/login?redirect=/invite/${token}`)}>
              Log In
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) return <LoadingScreen />

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold">Invalid Invitation</h1>
          <p className="text-muted-foreground">This link may have expired or is no longer valid.</p>
          <Button variant="streak" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    )
  }

  const challenge = data
  const isExpired = challenge.invitation_link_expires_at && new Date() > new Date(challenge.invitation_link_expires_at)
  const isAlreadyMember = challenge.participants?.some((p: any) => p.user_id === user.id && p.status === 'accepted')
  const gradient = getGradientForCategory(challenge.activity_category)
  const creator = challenge.creator as any

  const handleAccept = async () => {
    setAccepting(true)
    try {
      // Check if already a participant
      const { data: existing } = await supabase
        .from('challenge_participants')
        .select('id, status')
        .eq('challenge_id', challenge.id)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        // Update existing
        await supabase.from('challenge_participants').update({
          status: 'accepted',
          rule_version_accepted: challenge.current_rule_version,
          accepted_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        // Create new
        await supabase.from('challenge_participants').insert({
          challenge_id: challenge.id,
          user_id: user.id,
          status: 'accepted',
          rule_version_accepted: challenge.current_rule_version,
          accepted_at: new Date().toISOString(),
        })
      }

      toast({ title: 'Challenge accepted! 🎉', description: 'You\'re now part of this challenge.' })
      navigate(`/challenges/${challenge.id}`)
    } catch (err: any) {
      toast({ title: 'Failed to accept', description: err.message, variant: 'destructive' })
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    setDeclining(true)
    try {
      await supabase.from('challenge_participants').upsert({
        challenge_id: challenge.id,
        user_id: user.id,
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      })
      toast({ title: 'Invitation declined' })
      navigate('/dashboard')
    } catch {
      navigate('/dashboard')
    } finally {
      setDeclining(false)
    }
  }

  if (isAlreadyMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-jade-500 mx-auto" />
          <h1 className="text-2xl font-bold">You're already in!</h1>
          <Button variant="streak" onClick={() => navigate(`/challenges/${challenge.id}`)}>
            Go to Challenge <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="text-4xl">📩</div>
          <h1 className="text-2xl font-bold">You're invited!</h1>
          <p className="text-muted-foreground">
            <strong>{creator?.display_name}</strong> invited you to join an accountability challenge
          </p>
        </div>

        {isExpired && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex gap-3">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">
              This invitation has expired. Ask the creator for a new link.
            </p>
          </div>
        )}

        {/* Challenge card */}
        <Card className="overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${gradient}`} />
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl`}>
                {getCategoryEmoji(challenge.activity_category)}
              </div>
              <div>
                <h2 className="font-bold text-lg">{challenge.title}</h2>
                <p className="text-sm text-muted-foreground">{challenge.activity_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Daily Target', value: `${challenge.daily_target_value} ${challenge.daily_target_unit}` },
                { label: 'Duration', value: `${challenge.duration_days} days` },
                { label: 'Starts', value: formatDate(challenge.start_date) },
                { label: 'Daily Fine', value: challenge.fine_amount > 0 ? formatCurrency(challenge.fine_amount, challenge.currency) : 'No fine' },
                { label: 'Deadline', value: `${challenge.daily_deadline.slice(0, 5)} ${challenge.timezone}` },
                { label: 'Participants', value: `${challenge.participants?.filter((p: any) => p.status === 'accepted').length ?? 0} so far` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold">{value}</p>
                </div>
              ))}
            </div>

            {challenge.description && (
              <p className="text-sm text-muted-foreground border-t pt-3">{challenge.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Rules acceptance notice */}
        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-sm">
          <p className="font-medium mb-1">⚠️ By accepting, you agree to:</p>
          <ul className="text-muted-foreground space-y-0.5 list-disc list-inside text-xs">
            <li>Submit photo proof daily before {challenge.daily_deadline.slice(0, 5)} ({challenge.timezone})</li>
            <li>Pay {formatCurrency(challenge.fine_amount, challenge.currency)} for each missed day</li>
            <li>Participate for {challenge.duration_days} days starting {formatDate(challenge.start_date)}</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDecline}
            loading={declining}
            disabled={isExpired}
          >
            Decline
          </Button>
          <Button
            variant="streak"
            className="flex-1"
            onClick={handleAccept}
            loading={accepting}
            disabled={isExpired}
          >
            Accept Challenge 🤝
          </Button>
        </div>
      </div>
    </div>
  )
}
