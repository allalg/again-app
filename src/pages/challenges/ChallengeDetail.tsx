import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, Camera, MessageCircle, Trophy, Calendar,
  DollarSign, Users, Settings, Play, Pause, CheckCircle2,
  AlertCircle, Clock, Share2, Copy, Check, Trash2, LogOut,
  X, Eye, XCircle, RotateCcw, AlertTriangle, Plus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { UserAvatar } from '@/components/ui/Avatar'
import { toast } from '@/components/ui/Toaster'
import {
  formatDate, formatCurrency, getDaysRemaining, calculateCompletionRate,
  getGradientForCategory, getCategoryEmoji, getDayLabel, cn
} from '@/lib/utils'
import { syncParticipantStreak, calculateStreakFromRecords } from '@/lib/streak'
import type { ChallengeWithParticipants, DailyStatus } from '@/lib/database.types'

export function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'activity'>('overview')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [selectedProof, setSelectedProof] = useState<any>(null)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReasonPreset, setRejectReasonPreset] = useState('')
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0)

  // Auto-sync user streak if desynced or freshly completed
  useEffect(() => {
    if (!id || !user?.id) return
    syncParticipantStreak(id, user.id).then((stats) => {
      if (stats) {
        queryClient.invalidateQueries({ queryKey: ['challenge', id] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-challenges'] })
      }
    })
  }, [id, user?.id, queryClient])

  const getProofPhotoUrl = (path: string) => {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    const { data } = supabase.storage.from('proof-photos').getPublicUrl(path)
    return data.publicUrl
  }

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          participants:challenge_participants(
            *,
            profile:profiles!user_id(id, username, display_name, avatar_url, timezone)
          )
        `)
        .eq('id', id!)
        .single()

      if (error) {
        console.error('Challenge query error:', error)
        throw error
      }
      return data as unknown as ChallengeWithParticipants
    },
    enabled: !!id,
  })

  const { data: todayRecords } = useQuery({
    queryKey: ['today-records', id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('daily_challenge_records')
        .select(`
          *,
          submissions:proof_submissions(
            id, measured_value, measured_unit, meets_target, notes, submitted_at,
            attachments:proof_attachments(id, storage_path, file_name, file_size_bytes),
            reviews:proof_reviews(id, reviewer_id, verdict, reason, reviewed_at)
          ),
          submission:proof_submissions(
            id, measured_value, measured_unit, meets_target, notes, submitted_at,
            attachments:proof_attachments(id, storage_path, file_name, file_size_bytes),
            reviews:proof_reviews(id, reviewer_id, verdict, reason, reviewed_at)
          )
        `)
        .eq('challenge_id', id!)
        .eq('challenge_day', today)
      return data ?? []
    },
    enabled: !!id,
  })

  const { data: recentActivity } = useQuery({
    queryKey: ['challenge-activity', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_challenge_records')
        .select(`
          *,
          profile:profiles!user_id(id, username, display_name, avatar_url),
          submissions:proof_submissions(
            id, measured_value, measured_unit, meets_target, notes, submitted_at,
            attachments:proof_attachments(id, storage_path, file_name, file_size_bytes),
            reviews:proof_reviews(id, reviewer_id, verdict, reason, reviewed_at)
          ),
          submission:proof_submissions(
            id, measured_value, measured_unit, meets_target, notes, submitted_at,
            attachments:proof_attachments(id, storage_path, file_name, file_size_bytes),
            reviews:proof_reviews(id, reviewer_id, verdict, reason, reviewed_at)
          )
        `)
        .eq('challenge_id', id!)
        .order('challenge_day', { ascending: false })
        .limit(30)
      return data ?? []
    },
    enabled: !!id,
  })

  const { data: allChallengeRecords } = useQuery({
    queryKey: ['all-challenge-records', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_challenge_records')
        .select('user_id, challenge_day, status')
        .eq('challenge_id', id!)
      return data ?? []
    },
    enabled: !!id,
  })

  const deleteChallengeMutation = useMutation({
    mutationFn: async () => {
      if (!id) return

      // 1. Remove creator & all participants so it vanishes from dashboard immediately
      await supabase
        .from('challenge_participants')
        .delete()
        .eq('challenge_id', id)

      // 2. Update challenge status to archived/cancelled
      // (This always succeeds via challenges_update_creator policy and ensures Dashboard filters it out)
      await supabase
        .from('challenges')
        .update({
          status: 'archived',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: 'Deleted by creator',
        })
        .eq('id', id)

      // 3. Clean up child records
      try {
        await supabase.from('daily_challenge_records').delete().eq('challenge_id', id)
        await supabase.from('challenge_invitations').delete().eq('challenge_id', id)
        await supabase.from('chat_messages').delete().eq('challenge_id', id)
        await supabase.from('challenge_rule_versions').delete().eq('challenge_id', id)
      } catch (e) {
        console.warn('Child record cleanup warning:', e)
      }

      // 4. Hard delete the challenge record from challenges table
      const { error } = await supabase.from('challenges').delete().eq('id', id)
      if (error) {
        console.warn('Direct challenge delete warning:', error)
      }
    },
    onSuccess: async () => {
      toast({ title: 'Challenge deleted', description: 'The challenge has been permanently removed.' })
      queryClient.removeQueries({ queryKey: ['challenge', id] })
      queryClient.removeQueries({ queryKey: ['dashboard-challenges'] })
      await queryClient.invalidateQueries()
      navigate('/dashboard')
    },
    onError: (err: any) => {
      toast({ title: 'Failed to delete challenge', description: err.message, variant: 'destructive' })
    },
  })

  const leaveChallengeMutation = useMutation({
    mutationFn: async () => {
      if (!myParticipant) return

      // 1. Delete participant record
      const { data } = await supabase
        .from('challenge_participants')
        .delete()
        .eq('id', myParticipant.id)
        .select()

      // 2. If DELETE was blocked by missing RLS, update status to withdrawn
      if (!data || data.length === 0) {
        await supabase
          .from('challenge_participants')
          .update({
            status: 'withdrawn',
            withdrawn_at: new Date().toISOString(),
          })
          .eq('id', myParticipant.id)
      }
    },
    onSuccess: async () => {
      toast({ title: 'Left challenge', description: 'You have left this challenge.' })
      queryClient.removeQueries({ queryKey: ['challenge', id] })
      queryClient.removeQueries({ queryKey: ['dashboard-challenges'] })
      await queryClient.invalidateQueries()
      navigate('/dashboard')
    },
    onError: (err: any) => {
      toast({ title: 'Failed to leave challenge', description: err.message, variant: 'destructive' })
    },
  })

  const reviewProofMutation = useMutation({
    mutationFn: async ({
      submissionId,
      recordId,
      submitterUserId,
      verdict,
      reason,
    }: {
      submissionId: string
      recordId?: string
      submitterUserId?: string
      verdict: 'approved' | 'rejected'
      reason?: string
    }) => {
      // 1. Record peer review verdict
      const { error: reviewError } = await supabase
        .from('proof_reviews')
        .upsert({
          submission_id: submissionId,
          reviewer_id: user!.id,
          verdict,
          reason: reason || null,
          reviewed_at: new Date().toISOString(),
        }, { onConflict: 'submission_id,reviewer_id' })
      if (reviewError) throw reviewError

      // 2. Update target met status on the submission
      await supabase
        .from('proof_submissions')
        .update({ meets_target: verdict === 'approved' })
        .eq('id', submissionId)

      // 3. Update the daily record status if recordId provided
      if (recordId) {
        const { data: currentRec } = await supabase
          .from('daily_challenge_records')
          .select('id, status, participant_id')
          .eq('id', recordId)
          .single()

        const newStatus = verdict === 'approved' ? 'completed' : 'disputed'
        await supabase
          .from('daily_challenge_records')
          .update({ status: newStatus })
          .eq('id', recordId)

        // 4. Adjust participant stats for streaks/completed days
        if (currentRec?.participant_id) {
          const { data: part } = await supabase
            .from('challenge_participants')
            .select('current_streak, longest_streak, total_completed_days')
            .eq('id', currentRec.participant_id)
            .single()

          if (part) {
            if (verdict === 'approved' && currentRec.status !== 'completed') {
              const newStreak = (part.current_streak || 0) + 1
              await supabase
                .from('challenge_participants')
                .update({
                  current_streak: newStreak,
                  longest_streak: Math.max(newStreak, part.longest_streak || 0),
                  total_completed_days: (part.total_completed_days || 0) + 1,
                })
                .eq('id', currentRec.participant_id)
            } else if (verdict === 'rejected' && currentRec.status === 'completed') {
              await supabase
                .from('challenge_participants')
                .update({
                  current_streak: Math.max(0, (part.current_streak || 1) - 1),
                  total_completed_days: Math.max(0, (part.total_completed_days || 1) - 1),
                })
                .eq('id', currentRec.participant_id)
            }
          }
        }

        // 5. Send notification to the submitter so it immediately alerts them
        if (submitterUserId && submitterUserId !== user!.id) {
          const notifType = verdict === 'approved' ? 'submission_approved' : 'submission_disputed'
          const notifTitle = verdict === 'approved' ? 'Proof Approved! 🎉' : 'Proof Needs Revision ⚠️'
          const notifBody = verdict === 'approved'
            ? `Your proof for "${challenge?.title}" was verified by your partner.`
            : `Your proof for "${challenge?.title}" was rejected: ${reason || 'Did not meet requirements'}. Click to retry!`

          try {
            await supabase.from('notifications').insert({
              user_id: submitterUserId,
              type: notifType,
              title: notifTitle,
              body: notifBody,
              data: {
                challenge_id: id,
                record_id: recordId,
                submission_id: submissionId,
                reason: reason || null,
              },
            })
          } catch (notifErr) {
            console.warn('Notification insert notice:', notifErr)
          }
        }
      }
    },
    onSuccess: (_, vars) => {
      toast({
        title: vars.verdict === 'approved' ? 'Proof approved! 🎉' : 'Proof rejected',
        description: vars.verdict === 'approved'
          ? 'You verified this daily proof.'
          : 'Feedback recorded. Your peer can now re-submit their proof.',
      })
      queryClient.invalidateQueries({ queryKey: ['today-records', id] })
      queryClient.invalidateQueries({ queryKey: ['challenge', id] })
      queryClient.invalidateQueries({ queryKey: ['challenge-activity', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-challenges'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
      setSelectedProof(null)
      setShowRejectDialog(false)
      setRejectReasonPreset('')
      setCustomRejectReason('')
    },
    onError: (err: any) => {
      toast({ title: 'Review failed', description: err.message, variant: 'destructive' })
    },
  })

  const myParticipant = challenge?.participants?.find((p) => p.user_id === user?.id)
  const isCreator = challenge?.creator_id === user?.id
  const isMember = !!myParticipant && myParticipant.status === 'accepted'

  const myRecord = todayRecords?.find((r) => r.user_id === user?.id)
  const mySubmissions: any[] = Array.isArray(myRecord?.submissions)
    ? myRecord.submissions
    : Array.isArray(myRecord?.submission)
    ? myRecord.submission
    : myRecord?.submission
    ? [myRecord.submission]
    : []

  const latestRejectionReview = mySubmissions
    .flatMap((s: any) => s.reviews || [])
    .filter((r: any) => r.verdict === 'rejected')
    .sort((a: any, b: any) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime())[0]

  const myRejectionReason = latestRejectionReview?.reason

  const todayDate = new Date().toISOString().split('T')[0]
  const start = challenge ? new Date(challenge.start_date || todayDate) : new Date(todayDate)
  const now = new Date(todayDate)
  const dayDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const daysElapsed = challenge ? Math.max(1, dayDiff + 1) : 0
  const daysRemaining = challenge ? Math.max(0, challenge.duration_days - daysElapsed) : 0
  const overallProgress = challenge ? calculateCompletionRate(daysElapsed, challenge.duration_days) : 0

  const [isResponding, setIsResponding] = useState(false)

  const handleAccept = async () => {
    if (!user || !challenge) return
    setIsResponding(true)
    try {
      if (myParticipant) {
        const { error } = await supabase
          .from('challenge_participants')
          .update({
            status: 'accepted',
            rule_version_accepted: challenge.current_rule_version,
            accepted_at: new Date().toISOString(),
          })
          .eq('id', myParticipant.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('challenge_participants')
          .insert({
            challenge_id: challenge.id,
            user_id: user.id,
            status: 'accepted',
            rule_version_accepted: challenge.current_rule_version,
            accepted_at: new Date().toISOString(),
          })
        if (error) throw error
      }
      toast({ title: 'Challenge accepted! 🎉', description: "You're now an active participant." })
      queryClient.invalidateQueries({ queryKey: ['challenge', id] })
    } catch (err: any) {
      toast({ title: 'Failed to accept', description: err.message, variant: 'destructive' })
    } finally {
      setIsResponding(false)
    }
  }

  const handleDecline = async () => {
    if (!user || !challenge) return
    setIsResponding(true)
    try {
      const { error } = await supabase
        .from('challenge_participants')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('challenge_id', challenge.id)
        .eq('user_id', user.id)
      if (error) throw error
      toast({ title: 'Invitation declined' })
      navigate('/dashboard')
    } catch (err: any) {
      toast({ title: 'Failed to decline', description: err.message, variant: 'destructive' })
    } finally {
      setIsResponding(false)
    }
  }

  const copyInviteLink = async () => {
    if (!challenge?.invitation_link_token) return
    const link = `${window.location.origin}/invite/${challenge.invitation_link_token}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Invite link copied!', description: 'Share it with your friends.' })
  }

  if (isLoading) {
    return (
      <div className="page-container py-8 space-y-4">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="page-container py-16 text-center">
        <h2 className="text-xl font-bold mb-2">Challenge not found</h2>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const gradient = getGradientForCategory(challenge.activity_category)

  return (
    <div className="page-container py-6 space-y-6 max-w-4xl">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Pending invitation alert */}
      {myParticipant?.status === 'invited' && (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-base">You've been invited to this challenge!</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Accept to join your friends, track your streak, and participate in daily verification.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDecline}
              loading={isResponding}
            >
              Decline
            </Button>
            <Button
              variant="streak"
              size="sm"
              onClick={handleAccept}
              loading={isResponding}
            >
              Accept Pact 🎉
            </Button>
          </div>
        </div>
      )}

      {/* Proof Rejected Alert */}
      {myRecord?.status === 'disputed' && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base text-red-400">Proof was rejected</h3>
                <Badge variant="disputed">Needs Revision</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {myRejectionReason ? (
                  <span>Reviewer Feedback: <strong className="text-foreground">"{myRejectionReason}"</strong></span>
                ) : (
                  'Your review partner flagged your proof. You can re-submit your proof today to keep your streak!'
                )}
              </p>
              <p className="text-xs text-red-300/80 font-medium mt-1">
                Don't worry — you have an opportunity to re-submit today's proof and continue your streak.
              </p>
            </div>
          </div>
          <Button variant="streak" size="sm" asChild className="flex-shrink-0">
            <Link to={`/challenges/${id}/submit`}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Retry Proof 🔄
            </Link>
          </Button>
        </div>
      )}

      {/* Challenge hero card */}
      <div className="rounded-2xl overflow-hidden border bg-card shadow-sm">
        <div className={`h-2 bg-gradient-to-r ${gradient}`} />
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                {getCategoryEmoji(challenge.activity_category)}
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">{challenge.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {challenge.activity_name} · {challenge.daily_target_value} {challenge.daily_target_unit}/day
                </p>
                {challenge.description && (
                  <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
                )}
              </div>
            </div>
            <Badge variant={challenge.status as any}>{challenge.status.replace('_', ' ')}</Badge>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Day {daysElapsed} of {challenge.duration_days}</span>
              <span>{daysRemaining} days remaining</span>
            </div>
            <Progress value={overallProgress} variant="streak" />
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-4 gap-3 text-center mb-4">
            {[
              { label: 'Start', value: formatDate(challenge.start_date, 'MMM d') },
              { label: 'End', value: formatDate(challenge.end_date, 'MMM d') },
              { label: 'Deadline', value: challenge.daily_deadline.slice(0, 5) },
              { label: 'Fine', value: challenge.fine_amount > 0 ? formatCurrency(challenge.fine_amount, challenge.currency) : 'None' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-sm font-semibold mt-0.5">{value}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {isMember && challenge.status === 'active' && (
              <Button
                variant={myRecord?.status === 'disputed' ? 'destructive' : 'streak'}
                size="sm"
                asChild
              >
                <Link to={`/challenges/${id}/submit`}>
                  {myRecord?.status === 'disputed' ? (
                    <>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Retry Proof 🔄
                    </>
                  ) : myRecord?.status === 'completed' || myRecord?.status === 'submitted' ? (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Log Additional Entry
                    </>
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5 mr-1.5" />
                      Submit Today
                    </>
                  )}
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/challenges/${id}/chat`}>
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Chat
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/challenges/${id}/calendar`}>
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Calendar
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/challenges/${id}/leaderboard`}>
                <Trophy className="h-3.5 w-3.5 mr-1.5" />
                Leaderboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/challenges/${id}/ledger`}>
                <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                Ledger
              </Link>
            </Button>
            {(isCreator || isMember) && (
              <Button variant="outline" size="sm" onClick={copyInviteLink}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-jade-500" /> : <Share2 className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? 'Copied!' : 'Invite'}
              </Button>
            )}
            {isCreator ? (
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Activity
              </Button>
            ) : isMember ? (
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 border-border"
                onClick={() => setShowLeaveModal(true)}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Leave Activity
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['overview', 'members', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <h2 className="font-semibold">Today's Progress</h2>
          <div className="space-y-2">
            {challenge.participants
              ?.filter((p) => p.status === 'accepted')
              .map((participant) => {
                const record = todayRecords?.find((r) => r.user_id === participant.user_id)
                const profile = participant.profile as any
                const submissionsList: any[] = Array.isArray(record?.submissions)
                  ? record.submissions
                  : Array.isArray(record?.submission)
                  ? record.submission
                  : record?.submission
                  ? [record.submission]
                  : []

                const totalLogged = submissionsList.reduce((acc: number, s: any) => acc + (Number(s.measured_value) || 0), 0)
                const allAttachments = submissionsList.flatMap((s: any) => s.attachments || [])
                const activeSubmission = submissionsList[submissionsList.length - 1] || submissionsList[0]
                const isMe = participant.user_id === user?.id

                const participantRecords = allChallengeRecords?.filter((r) => r.user_id === participant.user_id) || []
                const pStats = calculateStreakFromRecords(participantRecords)
                const isTodayDone = record?.status === 'completed'
                const displayStreak = Math.max(participant.current_streak || 0, pStats.currentStreak, isTodayDone ? 1 : 0)
                const displayCompleted = Math.max(participant.total_completed_days || 0, pStats.totalCompleted, isTodayDone ? 1 : 0)

                return (
                  <div key={participant.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border hover:border-border/80 transition-all">
                    <UserAvatar
                      src={profile?.avatar_url}
                      name={profile?.display_name ?? 'User'}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{profile?.display_name}</p>
                        {isMe && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">You</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        🔥 {displayStreak} day streak · ✅ {displayCompleted} completed
                        {submissionsList.length > 0 && (
                          <span className="font-semibold text-foreground">
                            {` · ${totalLogged} / ${challenge.daily_target_value} ${challenge.daily_target_unit}`}
                            {submissionsList.length > 1 && ` (${submissionsList.length} logs)`}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Proof Photo Thumbnails */}
                    {allAttachments.length > 0 && (
                      <div className="flex -space-x-2 overflow-hidden flex-shrink-0">
                        {allAttachments.slice(0, 3).map((att: any, idx: number) => (
                          <button
                            key={att.id || idx}
                            type="button"
                            onClick={() => setSelectedProof({
                              ...record,
                              profile,
                              submissions: submissionsList,
                              submission: activeSubmission,
                              attachments: allAttachments,
                            })}
                            className="relative group h-11 w-11 rounded-lg overflow-hidden border border-border flex-shrink-0 shadow-sm ring-2 ring-background hover:z-10 hover:scale-105 transition-transform"
                            title="Click to view & review proof"
                          >
                            <img
                              src={getProofPhotoUrl(att.storage_path)}
                              alt="Proof"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Eye className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <DayStatusBadge status={record?.status} />
                      {isMe && record?.status === 'disputed' && (
                        <Button variant="streak" size="sm" className="h-7 text-xs px-2.5" asChild>
                          <Link to={`/challenges/${id}/submit`}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Retry
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* My stats */}
          {myParticipant && (() => {
            const isTodayDone = myRecord?.status === 'completed'
            const currentStreak = Math.max(myParticipant.current_streak || 0, isTodayDone ? 1 : 0)
            const longestStreak = Math.max(myParticipant.longest_streak || 0, currentStreak)
            const totalCompleted = Math.max(myParticipant.total_completed_days || 0, isTodayDone ? 1 : 0)

            return (
              <div className="rounded-xl bg-gradient-to-br from-streak-500/10 to-blue-500/10 border border-streak-500/20 p-4 space-y-3">
                <h3 className="font-semibold text-sm">My Stats</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'Current Streak', value: `🔥 ${currentStreak}` },
                    { label: 'Best Streak', value: `⚡ ${longestStreak}` },
                    { label: 'Completed', value: `✅ ${totalCompleted}` },
                    { label: 'Missed', value: `❌ ${myParticipant.total_missed_days}` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-sm font-bold">{value}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                {myParticipant.total_penalties_owed > 0 && (
                  <div className="flex items-center justify-between text-sm border-t border-border/50 pt-2">
                    <span className="text-muted-foreground">Penalties owed</span>
                    <span className="font-bold text-red-500">
                      {formatCurrency(myParticipant.total_penalties_owed, challenge.currency)}
                    </span>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-3">
          {challenge.participants?.map((participant) => {
            const profile = participant.profile as any
            const pRecords = allChallengeRecords?.filter((r) => r.user_id === participant.user_id) || []
            const pStats = calculateStreakFromRecords(pRecords)
            const currentStreak = Math.max(participant.current_streak || 0, pStats.currentStreak)
            const completedDays = Math.max(participant.total_completed_days || 0, pStats.totalCompleted)
            const missedDays = Math.max(participant.total_missed_days || 0, pStats.totalMissed)
            const completionRate = calculateCompletionRate(
              completedDays,
              Math.max(1, completedDays + missedDays)
            )
            return (
              <div key={participant.id} className="flex items-center gap-4 p-4 rounded-xl bg-card border">
                <UserAvatar
                  src={profile?.avatar_url}
                  name={profile?.display_name ?? 'User'}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{profile?.display_name}</p>
                    {participant.user_id === challenge.creator_id && (
                      <Badge variant="streak" className="text-[10px] py-0">Creator</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Completion rate</span>
                      <span>{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} variant="jade" className="h-1" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl">🔥</div>
                  <div className="text-sm font-bold">{currentStreak}</div>
                  <div className="text-xs text-muted-foreground">streak</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-3">
          {recentActivity?.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-xl border text-muted-foreground text-sm">
              No proof submissions recorded yet. Be the first to submit today!
            </div>
          ) : (
            recentActivity?.map((record) => {
              const profile = (record as any).profile
              const submission = Array.isArray((record as any).submission)
                ? (record as any).submission[0]
                : (record as any).submission
              const attachments = submission?.attachments ?? []

              return (
                <div key={record.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border hover:border-border/80 transition-all">
                  <UserAvatar
                    src={profile?.avatar_url}
                    name={profile?.display_name ?? 'User'}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{profile?.display_name}</span>
                      <span className="text-muted-foreground ml-1">
                        {record.status === 'completed' ? '✅ completed' :
                         record.status === 'missed' ? '❌ missed' :
                         record.status === 'submitted' ? '📸 submitted proof' :
                         record.status === 'disputed' ? '⚠️ proof rejected' :
                         record.status}
                      </span>
                    </p>
                    {submission && (
                      <p className="text-xs text-muted-foreground">
                        {submission.measured_value} {submission.measured_unit}
                        {submission.notes ? ` · "${submission.notes}"` : ''}
                      </p>
                    )}
                  </div>

                  {/* Photo thumbnail */}
                  {attachments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProof({
                        ...record,
                        profile,
                        submission,
                        attachments,
                      })}
                      className="relative group h-11 w-11 rounded-lg overflow-hidden border border-border flex-shrink-0 shadow-sm"
                      title="Click to view & review photo proof"
                    >
                      <img
                        src={getProofPhotoUrl(attachments[0].storage_path)}
                        alt="Proof"
                        className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4 text-white" />
                      </div>
                    </button>
                  )}

                  <span className="text-xs text-muted-foreground">
                    {formatDate(record.challenge_day, 'MMM d')}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Delete Challenge Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Delete Activity</h3>
                <p className="text-xs text-muted-foreground">Permanently remove this challenge</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-foreground">{challenge.title}</strong>? This will permanently remove all participant streaks, proofs, penalty records, and chat history.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteChallengeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteChallengeMutation.mutate()}
                loading={deleteChallengeMutation.isPending}
              >
                Delete Activity
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Challenge Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Leave Challenge</h3>
                <p className="text-xs text-muted-foreground">Withdraw from this pact</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to leave <strong className="text-foreground">{challenge.title}</strong>? Your participation and streaks in this challenge will be discontinued.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLeaveModal(false)}
                disabled={leaveChallengeMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => leaveChallengeMutation.mutate()}
                loading={leaveChallengeMutation.isPending}
              >
                Leave Activity
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Inspection & Peer Review Modal */}
      {selectedProof && (() => {
        const submissionsList: any[] = Array.isArray(selectedProof.submissions)
          ? selectedProof.submissions
          : Array.isArray(selectedProof.submission)
          ? selectedProof.submission
          : selectedProof.submission
          ? [selectedProof.submission]
          : []

        const totalLoggedValue = submissionsList.reduce((acc: number, s: any) => acc + (Number(s.measured_value) || 0), 0)
        const meetsTarget = totalLoggedValue >= Number(challenge.daily_target_value)
        const allAttachments = submissionsList.flatMap((s: any) => s.attachments || [])
        const activeSubmission = submissionsList[submissionsList.length - 1] || selectedProof.submission
        const isMyProof = selectedProof.user_id === user?.id

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={selectedProof.profile?.avatar_url}
                    name={selectedProof.profile?.display_name || 'Participant'}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{selectedProof.profile?.display_name || 'Participant'}</h3>
                      {isMyProof && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">You</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Day {selectedProof.day_number} · {formatDate(selectedProof.challenge_day)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedProof(null)
                    setShowRejectDialog(false)
                    setRejectReasonPreset('')
                    setCustomRejectReason('')
                    setSelectedPhotoIdx(0)
                  }}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Photo Preview & Thumbnails */}
              {allAttachments.length > 0 ? (
                <div className="space-y-2">
                  <div className="rounded-xl overflow-hidden border border-border bg-black/60 aspect-video flex items-center justify-center">
                    <img
                      src={getProofPhotoUrl(allAttachments[selectedPhotoIdx]?.storage_path || allAttachments[0].storage_path)}
                      alt="Proof submission"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {allAttachments.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {allAttachments.map((att: any, idx: number) => (
                        <button
                          key={att.id || idx}
                          type="button"
                          onClick={() => setSelectedPhotoIdx(idx)}
                          className={cn(
                            'h-12 w-12 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all',
                            selectedPhotoIdx === idx ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-border/60 opacity-60 hover:opacity-100'
                          )}
                        >
                          <img src={getProofPhotoUrl(att.storage_path)} alt="Thumbnail" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/30 rounded-xl text-muted-foreground text-sm">
                  No photo uploaded for this submission.
                </div>
              )}

              {/* Metrics */}
              <div className="bg-accent/40 rounded-xl p-3.5 flex items-center justify-between text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">
                    {submissionsList.length > 1 ? `Total Logged (${submissionsList.length} logs):` : 'Measured Value:'}
                  </span>
                  <p className="font-bold text-lg text-foreground">
                    {totalLoggedValue} {challenge.daily_target_unit}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">Daily Target:</span>
                  <p className="text-xs font-semibold text-foreground">
                    {challenge.daily_target_value} {challenge.daily_target_unit}/day
                  </p>
                  {meetsTarget ? (
                    <Badge variant="completed" className="mt-1">✓ Target Met</Badge>
                  ) : (
                    <Badge variant="missed" className="mt-1">Below Target</Badge>
                  )}
                </div>
              </div>

              {/* Daily entries breakdown if multiple */}
              {submissionsList.length > 1 && (
                <div className="space-y-1.5 border border-border/60 rounded-xl p-3 bg-muted/10">
                  <span className="text-xs font-semibold text-muted-foreground">Daily Entries Logged:</span>
                  <div className="space-y-1">
                    {submissionsList.map((sub: any, idx: number) => (
                      <div key={sub.id || idx} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                        <span className="font-medium text-foreground">
                          Log #{idx + 1}: {sub.measured_value} {sub.measured_unit}
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {sub.submitted_at ? formatDate(sub.submitted_at, 'h:mm a') : ''}
                          {sub.notes ? ` · "${sub.notes}"` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {submissionsList.length === 1 && activeSubmission?.notes && (
                <div className="text-xs bg-muted/20 p-3 rounded-lg text-muted-foreground">
                  <strong className="text-foreground">Notes:</strong> {activeSubmission.notes}
                </div>
              )}

              {/* Action area for own rejected proof */}
              {isMyProof && selectedProof.status === 'disputed' && (
                <div className="pt-2 border-t border-border space-y-2">
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Proof Rejected — Revision Needed</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your partner requested revision. Re-submit your proof before today's deadline to protect your streak.
                    </p>
                    <Button variant="streak" size="sm" asChild className="w-full">
                      <Link to={`/challenges/${id}/submit`}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Retry & Re-submit Proof Now
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Peer Review Buttons & Dialog */}
              {!isMyProof && (
                <div className="pt-3 border-t border-border space-y-2">
                  {showRejectDialog ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                          Select Rejection Reason
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowRejectDialog(false)
                            setRejectReasonPreset('')
                            setCustomRejectReason('')
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5">
                        {[
                          'Photo is blurry or unreadable',
                          'Daily target value was not achieved',
                          'Missing workout timestamp or proof stats',
                          'Wrong activity or duplicate photo',
                          'Other (specify below)',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setRejectReasonPreset(preset)
                              if (preset !== 'Other (specify below)') {
                                setCustomRejectReason('')
                              }
                            }}
                            className={cn(
                              'text-left text-xs px-3 py-2 rounded-lg border transition-colors',
                              rejectReasonPreset === preset
                                ? 'border-red-500/60 bg-red-500/10 text-red-300 font-medium'
                                : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      {rejectReasonPreset === 'Other (specify below)' && (
                        <Input
                          placeholder="Enter specific feedback or reason..."
                          value={customRejectReason}
                          onChange={(e) => setCustomRejectReason(e.target.value)}
                          className="text-xs"
                          autoFocus
                        />
                      )}

                      <Button
                        variant="destructive"
                        className="w-full text-xs"
                        size="sm"
                        disabled={
                          !rejectReasonPreset ||
                          (rejectReasonPreset === 'Other (specify below)' && !customRejectReason.trim()) ||
                          reviewProofMutation.isPending
                        }
                        loading={reviewProofMutation.isPending}
                        onClick={() => {
                          const finalReason =
                            rejectReasonPreset === 'Other (specify below)'
                              ? customRejectReason.trim()
                              : rejectReasonPreset
                          reviewProofMutation.mutate({
                            submissionId: activeSubmission?.id,
                            recordId: selectedProof.id,
                            submitterUserId: selectedProof.user_id,
                            verdict: 'rejected',
                            reason: finalReason,
                          })
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Confirm Rejection & Request Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Verify your friend's daily proof:</p>
                      <div className="flex gap-2">
                        <Button
                          variant="streak"
                          className="flex-1"
                          size="sm"
                          onClick={() => reviewProofMutation.mutate({
                            submissionId: activeSubmission?.id,
                            recordId: selectedProof.id,
                            submitterUserId: selectedProof.user_id,
                            verdict: 'approved',
                          })}
                          loading={reviewProofMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          Approve Proof
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
                          size="sm"
                          onClick={() => setShowRejectDialog(true)}
                        >
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Reject / Request Retry
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function DayStatusBadge({ status }: { status?: DailyStatus }) {
  if (!status || status === 'pending') return <Badge variant="pending">Pending</Badge>
  if (status === 'completed') return <Badge variant="completed">✓ Done</Badge>
  if (status === 'submitted') return <Badge variant="submitted">Reviewing</Badge>
  if (status === 'missed') return <Badge variant="missed">Missed</Badge>
  if (status === 'disputed') return <Badge variant="disputed">⚠️ Rejected</Badge>
  if (status === 'excused') return <Badge variant="excused">Excused</Badge>
  return <Badge variant="pending">{status}</Badge>
}
