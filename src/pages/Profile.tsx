import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Edit2, Save, X, Flame, Trophy, Calendar, DollarSign } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { UserAvatar } from '@/components/ui/Avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { toast } from '@/components/ui/Toaster'
import { Progress } from '@/components/ui/Progress'
import { formatDate, formatCurrency } from '@/lib/utils'
import { USERNAME_REGEX } from '@/lib/utils'

const profileSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(50),
  username: z.string().regex(USERNAME_REGEX, 'Username: 3-30 chars, letters/numbers/underscores'),
  bio: z.string().max(200).optional(),
  timezone: z.string().min(1, 'Timezone is required'),
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { user, profile, setProfile } = useAuthStore()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async () => {
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('*, challenge:challenges(status, duration_days)')
        .eq('user_id', user!.id)
        .eq('status', 'accepted')

      const challenges = participants ?? []
      const completed = challenges.filter((p) => (p.challenge as any)?.status === 'completed').length
      const active = challenges.filter((p) => (p.challenge as any)?.status === 'active').length

      const totalCompleted = challenges.reduce((sum, p) => sum + p.total_completed_days, 0)
      const totalMissed = challenges.reduce((sum, p) => sum + p.total_missed_days, 0)
      const bestStreak = challenges.reduce((max, p) => Math.max(max, p.longest_streak), 0)
      const totalPaid = challenges.reduce((sum, p) => sum + p.total_penalties_owed, 0)

      return { completed, active, totalChallenges: challenges.length, totalCompleted, totalMissed, bestStreak, totalPaid }
    },
    enabled: !!user,
  })

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name ?? '',
      username: profile?.username ?? '',
      bio: profile?.bio ?? '',
      timezone: profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const updateProfile = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user!.id)
        .select()
        .single()

      if (error) throw error
      return updated
    },
    onSuccess: (updated) => {
      setProfile(updated as any)
      setIsEditing(false)
      toast({ title: 'Profile updated!' })
    },
    onError: (err: any) => {
      toast({ title: 'Failed to update profile', description: err.message, variant: 'destructive' })
    },
  })

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage.from('user-content').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('user-content').getPublicUrl(path)

      const { data: updated } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)
        .select()
        .single()

      if (updated) setProfile(updated as any)
      toast({ title: 'Avatar updated! 🎉' })
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const completionRate = stats
    ? Math.round(stats.totalCompleted / Math.max(stats.totalCompleted + stats.totalMissed, 1) * 100)
    : 0

  return (
    <div className="page-container py-8 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile</h1>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Cancel
          </Button>
        )}
      </div>

      {/* Avatar & name */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <UserAvatar
            src={profile?.avatar_url}
            name={profile?.display_name ?? 'User'}
            size="2xl"
          />
          <label className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center cursor-pointer hover:bg-accent transition-colors shadow-sm">
            {uploadingAvatar ? (
              <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5 text-foreground" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile?.display_name}</h2>
          <p className="text-muted-foreground">@{profile?.username}</p>
          {profile?.bio && <p className="text-sm mt-1 text-muted-foreground">{profile.bio}</p>}
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((d) => updateProfile.mutate(d))} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Display Name</label>
                <Input {...form.register('display_name')} error={form.formState.errors.display_name?.message} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Username</label>
                <Input {...form.register('username')} error={form.formState.errors.username?.message} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Bio</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  placeholder="Tell your challengers about yourself..."
                  maxLength={200}
                  {...form.register('bio')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Timezone</label>
                <Input {...form.register('timezone')} />
              </div>
              <Button type="submit" variant="streak" loading={updateProfile.isPending}>
                <Save className="h-4 w-4 mr-1.5" />
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Challenges', value: stats?.totalChallenges ?? 0, icon: '🏆' },
          { label: 'Best Streak', value: `${stats?.bestStreak ?? 0} days`, icon: '🔥' },
          { label: 'Days Completed', value: stats?.totalCompleted ?? 0, icon: '✅' },
          { label: 'Penalties Paid', value: formatCurrency(stats?.totalPaid ?? 0), icon: '💰' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="stat-card text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-lg font-bold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Completion rate */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Overall Completion Rate</h3>
            <span className="text-2xl font-bold gradient-text">{completionRate}%</span>
          </div>
          <Progress value={completionRate} variant="streak" showLabel />
          <div className="grid grid-cols-2 gap-2 text-sm pt-1">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-jade-500" />
              <span className="text-muted-foreground">Completed: <strong>{stats?.totalCompleted ?? 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Missed: <strong>{stats?.totalMissed ?? 0}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
