import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, UserPlus, Check, X, Users, UserCheck, MessageCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserAvatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'
import { formatRelativeTime } from '@/lib/utils'

export function FriendsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [tab, setTab] = useState<'friends' | 'requests' | 'sent'>('friends')

  const { data: friendships } = useQuery({
    queryKey: ['friendships', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!requester_id(id, username, display_name, avatar_url),
          addressee:profiles!addressee_id(id, username, display_name, avatar_url)
        `)
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`)
      return data ?? []
    },
    enabled: !!user,
  })

  const friends = friendships?.filter((f) => f.status === 'accepted') ?? []
  const receivedRequests = friendships?.filter(
    (f) => f.status === 'pending' && f.addressee_id === user?.id
  ) ?? []
  const sentRequests = friendships?.filter(
    (f) => f.status === 'pending' && f.requester_id === user?.id
  ) ?? []

  const getFriendProfile = (friendship: any) =>
    friendship.requester_id === user?.id ? friendship.addressee : friendship.requester

  const searchUsers = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return }
    setIsSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', user!.id)
      .limit(8)
    setSearchResults(data ?? [])
    setIsSearching(false)
  }

  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      const { error } = await supabase.from('friendships').insert({
        requester_id: user!.id,
        addressee_id: addresseeId,
        status: 'pending',
      })
      if (error) throw error

      const senderName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'A user'
      await supabase.from('notifications').insert({
        user_id: addresseeId,
        type: 'friend_request',
        title: 'New friend request',
        body: `${senderName} sent you a friend request`,
        data: { user_id: user!.id },
      })
    },
    onSuccess: () => {
      toast({ title: 'Friend request sent!' })
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
    },
    onError: (err: any) => {
      toast({ title: 'Failed to send request', description: err.message, variant: 'destructive' })
    },
  })

  const respondToRequest = useMutation({
    mutationFn: async ({ id, accept }: { id: string; accept: boolean }) => {
      const friendship = friendships?.find((f) => f.id === id)
      const { error } = await supabase.from('friendships')
        .update({ status: accept ? 'accepted' : 'rejected', updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      if (accept && friendship) {
        const responderName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || 'A friend'
        await supabase.from('notifications').insert({
          user_id: friendship.requester_id,
          type: 'friend_accepted',
          title: 'Friend request accepted!',
          body: `${responderName} accepted your friend request`,
          data: { user_id: user!.id },
        })
      }
    },
    onSuccess: (_, vars) => {
      toast({ title: vars.accept ? 'Friend request accepted!' : 'Request declined' })
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
    },
  })

  const removeFriend = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('friendships').delete().eq('id', id)
    },
    onSuccess: () => {
      toast({ title: 'Friend removed' })
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
    },
  })

  const isAlreadyFriend = (profileId: string) =>
    friendships?.some((f) =>
      f.status !== 'rejected' &&
      ((f.requester_id === user?.id && f.addressee_id === profileId) ||
       (f.addressee_id === user?.id && f.requester_id === profileId))
    ) ?? false

  return (
    <div className="page-container py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Friends</h1>
        <p className="text-muted-foreground text-sm">Manage your accountability network</p>
      </div>

      {/* Search */}
      <div className="space-y-3">
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
          <div className="rounded-xl border bg-card divide-y divide-border">
            {searchResults.map((profile) => {
              const already = isAlreadyFriend(profile.id)
              return (
                <div key={profile.id} className="flex items-center gap-3 p-3">
                  <UserAvatar src={profile.avatar_url} name={profile.display_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{profile.username}</p>
                  </div>
                  {already ? (
                    <Badge variant="active">Added</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendRequest.mutate(profile.id)}
                      loading={sendRequest.isPending}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'friends', label: 'Friends', count: friends.length },
          { id: 'requests', label: 'Requests', count: receivedRequests.length },
          { id: 'sent', label: 'Sent', count: sentRequests.length },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Friends list */}
      {tab === 'friends' && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No friends yet</p>
              <p className="text-sm text-muted-foreground">Search above to add friends</p>
            </div>
          ) : (
            friends.map((f) => {
              const profile = getFriendProfile(f)
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-border/80 transition-colors">
                  <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? 'User'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile?.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeFriend.mutate(f.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Received requests */}
      {tab === 'requests' && (
        <div className="space-y-2">
          {receivedRequests.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No pending requests</p>
            </div>
          ) : (
            receivedRequests.map((f) => {
              const profile = f.requester
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                  <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? 'User'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile?.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username} · {formatRelativeTime(f.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToRequest.mutate({ id: f.id, accept: false })}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="jade"
                      onClick={() => respondToRequest.mutate({ id: f.id, accept: true })}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Sent requests */}
      {tab === 'sent' && (
        <div className="space-y-2">
          {sentRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No pending sent requests</p>
            </div>
          ) : (
            sentRequests.map((f) => {
              const profile = f.addressee
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                  <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? 'User'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{profile?.display_name}</p>
                    <p className="text-xs text-muted-foreground">@{profile?.username}</p>
                  </div>
                  <Badge variant="pending">Pending</Badge>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
