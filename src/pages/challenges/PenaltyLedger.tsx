import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, DollarSign, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Plus
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { UserAvatar } from '@/components/ui/Avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import type { PenaltyWithDetails } from '@/lib/database.types'

export function PenaltyLedgerPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showSettleDialog, setShowSettleDialog] = useState(false)
  const [selectedPenaltyId, setSelectedPenaltyId] = useState<string | null>(null)
  const [settlementNote, setSettlementNote] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const { data: challenge } = useQuery({
    queryKey: ['challenge-meta', id],
    queryFn: async () => {
      const { data } = await supabase.from('challenges').select('title, currency, fine_amount').eq('id', id!).single()
      return data
    },
    enabled: !!id,
  })

  const { data: penalties, isLoading } = useQuery({
    queryKey: ['penalties', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('penalties')
        .select(`
          *,
          payer:profiles!payer_id(id, username, display_name, avatar_url),
          allocations:penalty_allocations(
            *,
            recipient:profiles!recipient_id(id, username, display_name, avatar_url)
          ),
          daily_record:daily_challenge_records(challenge_day, day_number)
        `)
        .eq('challenge_id', id!)
        .order('challenge_day', { ascending: false })
      return (data ?? []) as unknown as PenaltyWithDetails[]
    },
    enabled: !!id,
  })

  const { data: balances } = useQuery({
    queryKey: ['balances', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('challenge_participants')
        .select('*, profile:profiles!user_id(id, display_name, avatar_url)')
        .eq('challenge_id', id!)
        .eq('status', 'accepted')
      return data ?? []
    },
    enabled: !!id,
  })

  const markSettled = useMutation({
    mutationFn: async (penaltyId: string) => {
      const { error } = await supabase
        .from('penalties')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          settlement_note: settlementNote || null,
        })
        .eq('id', penaltyId)
        .eq('payer_id', user!.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Penalty marked as settled ✓' })
      queryClient.invalidateQueries({ queryKey: ['penalties', id] })
      setShowSettleDialog(false)
      setSettlementNote('')
      setSelectedPenaltyId(null)
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update', description: err.message, variant: 'destructive' })
    },
  })

  const totalOwed = penalties
    ?.filter((p) => p.payer_id === user?.id && p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0) ?? 0

  const totalToReceive = penalties
    ?.flatMap((p) => p.allocations)
    .filter((a) => a.recipient_id === user?.id && a.status === 'pending')
    .reduce((sum, a) => sum + a.amount, 0) ?? 0

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="page-container py-6 max-w-3xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold">Penalty Ledger</h1>
        <p className="text-muted-foreground text-sm">{challenge?.title}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="stat-card border-red-500/20 bg-red-500/5">
          <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center mb-2">
            <DollarSign className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-500">
            {formatCurrency(totalOwed, challenge?.currency ?? 'USD')}
          </div>
          <div className="text-xs text-muted-foreground">You owe (pending)</div>
        </div>

        <div className="stat-card border-jade-500/20 bg-jade-500/5">
          <div className="h-8 w-8 rounded-lg bg-jade-500/20 flex items-center justify-center mb-2">
            <DollarSign className="h-4 w-4 text-jade-500" />
          </div>
          <div className="text-2xl font-bold text-jade-500">
            {formatCurrency(totalToReceive, challenge?.currency ?? 'USD')}
          </div>
          <div className="text-xs text-muted-foreground">You're owed (pending)</div>
        </div>
      </div>

      {/* Balances overview */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">All Balances</h2>
        </div>
        <div className="divide-y divide-border">
          {balances?.map((p: any) => {
            const profile = p.profile
            const isMe = p.user_id === user?.id
            const net = p.total_penalties_received - p.total_penalties_owed
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? 'User'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{profile?.display_name} {isMe && '(you)'}</p>
                  <p className="text-xs text-muted-foreground">
                    Owed: {formatCurrency(p.total_penalties_owed, challenge?.currency ?? 'USD')} · 
                    Received: {formatCurrency(p.total_penalties_received, challenge?.currency ?? 'USD')}
                  </p>
                </div>
                <div className={`text-sm font-bold ${net >= 0 ? 'text-jade-500' : 'text-red-500'}`}>
                  {net >= 0 ? '+' : ''}{formatCurrency(net, challenge?.currency ?? 'USD')}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Penalty list */}
      <div>
        <h2 className="font-semibold mb-3">Penalty History</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : penalties?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-jade-500" />
            <p className="font-medium">No penalties yet!</p>
            <p className="text-sm">Everyone is hitting their targets. Keep it up! 💪</p>
          </div>
        ) : (
          <div className="space-y-2">
            {penalties?.map((penalty) => {
              const payer = penalty.payer as any
              const isMyPenalty = penalty.payer_id === user?.id
              const isExpanded = expandedRows.has(penalty.id)

              return (
                <div key={penalty.id} className="rounded-xl border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleRow(penalty.id)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left"
                  >
                    <UserAvatar src={payer?.avatar_url} name={payer?.display_name ?? 'User'} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {isMyPenalty ? 'You' : payer?.display_name} missed Day {(penalty.daily_record as any)?.day_number}
                        </p>
                        <Badge variant={penalty.status as any}>{penalty.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(penalty.challenge_day)} · {formatCurrency(penalty.amount, penalty.currency)}
                      </p>
                    </div>
                    <div className={`text-sm font-bold ${isMyPenalty ? 'text-red-500' : 'text-jade-500'}`}>
                      {isMyPenalty ? '-' : '+'}{formatCurrency(penalty.amount, penalty.currency)}
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border space-y-3">
                      <p className="text-xs text-muted-foreground pt-3">{penalty.reason}</p>

                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Distributed to:</p>
                        {penalty.allocations?.map((alloc) => (
                          <div key={alloc.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <UserAvatar
                                src={(alloc.recipient as any)?.avatar_url}
                                name={(alloc.recipient as any)?.display_name ?? 'User'}
                                size="xs"
                              />
                              <span>{(alloc.recipient as any)?.display_name}</span>
                            </div>
                            <span className="text-jade-500 font-medium">
                              +{formatCurrency(alloc.amount, penalty.currency)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {isMyPenalty && penalty.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPenaltyId(penalty.id)
                            setShowSettleDialog(true)
                          }}
                          className="w-full border-jade-500/30 text-jade-600 hover:bg-jade-500/10"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Settle dialog */}
      <Dialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Penalty as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Confirm that you've paid this penalty. This will be visible to all challenge members.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Payment note (optional)</label>
              <Input
                placeholder="e.g. Paid via Venmo, Cash, etc."
                value={settlementNote}
                onChange={(e) => setSettlementNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>Cancel</Button>
            <Button
              variant="jade"
              loading={markSettled.isPending}
              onClick={() => selectedPenaltyId && markSettled.mutate(selectedPenaltyId)}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
