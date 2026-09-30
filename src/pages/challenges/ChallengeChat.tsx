import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Send, Image, Smile, Reply, Trash2,
  AlertCircle, Check, CheckCheck
} from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { UserAvatar } from '@/components/ui/Avatar'
import { toast } from '@/components/ui/Toaster'
import { formatRelativeTime, cn } from '@/lib/utils'
import type { ChatMessageWithSender } from '@/lib/database.types'

export function ChallengeChatPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessageWithSender | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch challenge name
  const { data: challenge } = useQuery({
    queryKey: ['challenge-name', id],
    queryFn: async () => {
      const { data } = await supabase.from('challenges').select('title, status').eq('id', id!).single()
      return data
    },
    enabled: !!id,
  })

  // Fetch messages
  const { data: messages } = useQuery({
    queryKey: ['chat-messages', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles(id, username, display_name, avatar_url),
          reactions:message_reactions(*, user:profiles(id, username, display_name, avatar_url)),
          reply_to:chat_messages!reply_to_id(
            id, content, message_type,
            sender:profiles(id, display_name)
          )
        `)
        .eq('challenge_id', id!)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      return (data ?? []) as unknown as ChatMessageWithSender[]
    },
    enabled: !!id,
  })

  // Subscribe to new messages
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `challenge_id=eq.${id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', id] })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', id] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from('chat_messages').insert({
        challenge_id: id!,
        sender_id: user!.id,
        message_type: 'text',
        content: text.trim(),
        reply_to_id: replyTo?.id ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setMessage('')
      setReplyTo(null)
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] })
    },
    onError: (err: any) => {
      toast({ title: 'Failed to send message', description: err.message, variant: 'destructive' })
    },
  })

  const addReaction = useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const { error } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user!.id,
        emoji,
      })
      if (error) {
        // Toggle off if already reacted
        await supabase.from('message_reactions')
          .delete()
          .eq('message_id', messageId)
          .eq('user_id', user!.id)
          .eq('emoji', emoji)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] })
    },
  })

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase.from('chat_messages').update({ is_deleted: true }).eq('id', messageId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', id] })
    },
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    sendMessage.mutate(message)
  }

  const groupedMessages = groupByDate(messages ?? [])

  return (
    <div className="flex flex-col h-screen lg:h-[calc(100vh-0px)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xl flex-shrink-0">
        <button onClick={() => navigate(-1)} className="rounded-xl p-1.5 hover:bg-accent transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold truncate">{challenge?.title ?? 'Challenge Chat'}</h1>
          <p className="text-xs text-muted-foreground">Group chat</p>
        </div>
        <div className={`h-2.5 w-2.5 rounded-full ${challenge?.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground px-2 font-medium">{date}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {msgs.map((msg, i) => {
              const isOwn = msg.sender_id === user?.id
              const showAvatar = !isOwn && (i === 0 || msgs[i - 1]?.sender_id !== msg.sender_id)
              const isSystem = msg.message_type === 'system'

              if (isSystem) {
                return (
                  <div key={msg.id} className="text-center text-xs text-muted-foreground py-1">
                    {msg.content}
                  </div>
                )
              }

              return (
                <motion.div
                  key={msg.id}
                  className={cn('flex gap-2 group', isOwn ? 'flex-row-reverse' : 'flex-row')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <UserAvatar
                          src={msg.sender?.avatar_url}
                          name={msg.sender?.display_name ?? 'User'}
                          size="xs"
                        />
                      )}
                    </div>
                  )}

                  <div className={cn('max-w-[75%] space-y-1', isOwn ? 'items-end' : 'items-start')}>
                    {showAvatar && !isOwn && (
                      <p className="text-xs text-muted-foreground px-1">{msg.sender?.display_name}</p>
                    )}

                    {/* Reply preview */}
                    {msg.reply_to && (
                      <div className={cn(
                        'text-xs text-muted-foreground px-3 py-1.5 rounded-xl border-l-2 border-primary bg-muted/50',
                        isOwn ? 'text-right' : 'text-left'
                      )}>
                        <span className="font-medium">{(msg.reply_to as any)?.sender?.display_name}</span>:{' '}
                        {(msg.reply_to as any)?.content?.slice(0, 50)}
                      </div>
                    )}

                    <div className={cn(
                      'relative',
                      isOwn ? 'chat-bubble-own' : 'chat-bubble-other'
                    )}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={cn('text-[10px] mt-1', isOwn ? 'text-white/60 text-right' : 'text-muted-foreground')}>
                        {formatRelativeTime(msg.created_at)}
                        {msg.edited_at && ' (edited)'}
                      </p>
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(
                          msg.reactions.reduce<Record<string, number>>((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
                            return acc
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction.mutate({ messageId: msg.id, emoji })}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border text-xs hover:bg-accent transition-colors"
                          >
                            {emoji} {count}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Actions (on hover) */}
                    <div className={cn(
                      'flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}>
                      <button
                        onClick={() => setReplyTo(msg)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <Reply className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => {
                          const emojiOptions = ['👍', '❤️', '🔥', '💪', '🎉', '😂']
                          addReaction.mutate({ messageId: msg.id, emoji: emojiOptions[0] })
                        }}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <Smile className="h-3 w-3 text-muted-foreground" />
                      </button>
                      {isOwn && (
                        <button
                          onClick={() => deleteMessage.mutate(msg.id)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border text-sm"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Reply className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-primary font-medium">{replyTo.sender?.display_name}</span>:{' '}
              <span className="text-muted-foreground truncate">{replyTo.content}</span>
            </div>
            <button onClick={() => setReplyTo(null)}>
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur-xl px-4 py-3 pb-safe">
        <form onSubmit={handleSend} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-2xl border bg-background px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Message the group..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              maxLength={2000}
            />
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
          <Button
            type="submit"
            variant="streak"
            size="icon"
            disabled={!message.trim() || sendMessage.isPending}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}

function groupByDate(messages: ChatMessageWithSender[]) {
  return messages.reduce<Record<string, ChatMessageWithSender[]>>((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric'
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})
}
