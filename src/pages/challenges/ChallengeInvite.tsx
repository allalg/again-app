import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Copy, Check, Share2, UserPlus, Search,
  Mail, ExternalLink, Clock
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserAvatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'
import { formatDate } from '@/lib/utils'

export function ChallengeInvitePage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())

  const { data: challenge } = useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const { data } = await supabase.from('challenges').select('*').eq('id', id!).single()
      return data
    },
    enabled: !!id,
  })

  const { data: existingParticipants } = useQuery({
    queryKey: ['participants', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenge_participants')
        .select('user_id, status')
        .eq('challenge_id', id!)
      return data ?? []
    },
    enabled: !!id,
  })

  const existingUserIds = new Set(existingParticipants?.map((p) => p.user_id) ?? [])
  const inviteLink = challenge?.invitation_link_token
    ? `${window.location.origin}/invite/${challenge.invitation_link_token}`
    : ''

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast({ title: 'Invite link copied!' })
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      return
    }
    setIsSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', user?.id)
      .limit(8)
    setSearchResults(data ?? [])
    setIsSearching(false)
  }

  const sendInvite = async (inviteeId: string) => {
    try {
      const { error: inviteErr } = await supabase.from('challenge_invitations').insert({
        challenge_id: id!,
        inviter_id: user!.id,
        invitee_id: inviteeId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      if (inviteErr) throw inviteErr

      const { error: partErr } = await supabase.from('challenge_participants').insert({
        challenge_id: id!,
        user_id: inviteeId,
        status: 'invited',
        invited_by: user!.id,
      })
      if (partErr && partErr.code !== '23505') throw partErr // ignore if already invited

      // Send notification
      const senderName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email || 'A friend'
      const { error: notifErr } = await supabase.from('notifications').insert({
        user_id: inviteeId,
        type: 'challenge_invite',
        title: "You've been invited to a challenge!",
        body: `${senderName} invited you to join "${challenge?.title}"`,
        data: {
          challenge_id: id,
          challenge_title: challenge?.title,
          token: challenge?.invitation_link_token,
        },
      })
      if (notifErr) throw notifErr

      setInvitedIds((prev) => new Set([...prev, inviteeId]))
      toast({ title: 'Invitation sent! 🎉' })
    } catch (err: any) {
      toast({ title: 'Failed to send invite', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="page-container py-6 max-w-xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">Invite Friends</h1>
        <p className="text-muted-foreground text-sm">{challenge?.title}</p>
      </div>

      {/* Invite link */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold mb-1">Share Invite Link</h2>
          <p className="text-xs text-muted-foreground">
            Anyone with this link can join your challenge. Link expires{' '}
            {challenge?.invitation_link_expires_at
              ? formatDate(challenge.invitation_link_expires_at)
              : 'in 7 days'}.
          </p>
        </div>

        <div className="flex gap-2">
          <Input
            value={inviteLink}
            readOnly
            className="text-xs text-muted-foreground"
          />
          <Button variant="outline" size="icon" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4 text-jade-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="streak" size="sm" onClick={copyLink} className="flex-1">
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            if (navigator.share) {
              await navigator.share({
                title: `Join "${challenge?.title}" on A GAIN`,
                url: inviteLink,
              })
            } else copyLink()
          }} className="flex-1">
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Search friends */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold mb-1">Invite by Username</h2>
          <p className="text-xs text-muted-foreground">Search for A GAIN users to invite directly.</p>
        </div>

        <Input
          placeholder="Search by username or name..."
          leftIcon={<Search className="h-4 w-4" />}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            searchUsers(e.target.value)
          }}
        />

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((profile) => {
              const alreadyMember = existingUserIds.has(profile.id)
              const alreadyInvited = invitedIds.has(profile.id)
              return (
                <div key={profile.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
                  <UserAvatar src={profile.avatar_url} name={profile.display_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{profile.username}</p>
                  </div>
                  {alreadyMember ? (
                    <Badge variant="active">Member</Badge>
                  ) : alreadyInvited ? (
                    <Badge variant="pending">Invited</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => sendInvite(profile.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Invite
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rules reminder */}
      <div className="rounded-xl bg-muted/30 border p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">📋 Rules acceptance required</p>
        <p>Every invited participant must explicitly accept the challenge rules and financial terms before the challenge starts.</p>
      </div>

      <Button variant="streak" className="w-full" onClick={() => navigate(`/challenges/${id}`)}>
        Done — Go to Challenge →
      </Button>
    </div>
  )
}
