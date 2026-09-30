import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Plus, X, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'
import { generateInviteToken, getGradientForCategory, getCategoryEmoji } from '@/lib/utils'
import type { ActivityCategory, MeasurementType } from '@/lib/database.types'

const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string; emoji: string }[] = [
  { value: 'fitness', label: 'Fitness', emoji: '🏃' },
  { value: 'mindfulness', label: 'Mindfulness', emoji: '🧘' },
  { value: 'learning', label: 'Learning', emoji: '📚' },
  { value: 'health', label: 'Health', emoji: '💪' },
  { value: 'creative', label: 'Creative', emoji: '🎨' },
  { value: 'social', label: 'Social', emoji: '👥' },
  { value: 'productivity', label: 'Productivity', emoji: '⚡' },
  { value: 'nutrition', label: 'Nutrition', emoji: '🥗' },
  { value: 'sleep', label: 'Sleep', emoji: '😴' },
  { value: 'custom', label: 'Custom', emoji: '✨' },
]

const MEASUREMENT_TYPES: { value: MeasurementType; label: string; unit: string }[] = [
  { value: 'duration_minutes', label: 'Duration (minutes)', unit: 'min' },
  { value: 'distance_km', label: 'Distance (kilometers)', unit: 'km' },
  { value: 'distance_miles', label: 'Distance (miles)', unit: 'mi' },
  { value: 'count', label: 'Count / Reps', unit: 'reps' },
  { value: 'pages', label: 'Pages', unit: 'pages' },
  { value: 'custom', label: 'Custom Unit', unit: '' },
]

const PRESET_ACTIVITIES = [
  { name: 'Morning Run', category: 'fitness' as ActivityCategory, target: 5, unit: 'km', measurement: 'distance_km' as MeasurementType },
  { name: 'Meditation', category: 'mindfulness' as ActivityCategory, target: 30, unit: 'min', measurement: 'duration_minutes' as MeasurementType },
  { name: 'Reading', category: 'learning' as ActivityCategory, target: 25, unit: 'pages', measurement: 'pages' as MeasurementType },
  { name: 'Gym Workout', category: 'fitness' as ActivityCategory, target: 60, unit: 'min', measurement: 'duration_minutes' as MeasurementType },
  { name: 'Language Study', category: 'learning' as ActivityCategory, target: 30, unit: 'min', measurement: 'duration_minutes' as MeasurementType },
  { name: 'Journaling', category: 'creative' as ActivityCategory, target: 15, unit: 'min', measurement: 'duration_minutes' as MeasurementType },
]

const schema = z.object({
  title: z.string().min(2, 'Challenge title must be at least 2 characters').max(80),
  description: z.string().max(500).optional(),
  activity_name: z.string().min(1, 'Activity name is required').max(60),
  activity_category: z.enum(['fitness', 'mindfulness', 'learning', 'health', 'creative', 'social', 'productivity', 'nutrition', 'sleep', 'custom']),
  measurement_type: z.enum(['duration_minutes', 'distance_km', 'distance_miles', 'count', 'pages', 'custom']),
  custom_measurement_unit: z.string().optional(),
  daily_target_value: z.number().positive('Target must be greater than 0').max(10000),
  daily_target_unit: z.string().min(1, 'Unit is required'),
  start_date: z.string().min(1, 'Start date is required'),
  duration_days: z.number().int().min(1, 'Minimum 1 day').max(365, 'Maximum 365 days'),
  daily_deadline: z.string().min(1, 'Deadline time is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  fine_amount: z.number().min(0, 'Fine must be non-negative').max(10000),
  currency: z.string().min(1).max(5),
  penalty_distribution: z.enum(['equal', 'proportional', 'winner']),
  no_recipient_policy: z.enum(['carry_forward', 'charity', 'void']),
  proof_review_required: z.boolean(),
  allow_excused_absences: z.boolean(),
  max_excused_days: z.number().int().min(0).max(30),
  grace_period_minutes: z.number().int().min(0).max(1440),
})

type ChallengeForm = z.infer<typeof schema>

const STEPS = [
  { id: 1, title: 'Activity', desc: 'What are you challenging?' },
  { id: 2, title: 'Schedule', desc: 'When and how long?' },
  { id: 3, title: 'Rules & Fines', desc: 'Set your accountability rules' },
  { id: 4, title: 'Review', desc: 'Confirm your challenge' },
]

export function CreateChallengePage() {
  const [step, setStep] = useState(1)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const todayStr = new Date().toISOString().split('T')[0]

  const form = useForm<ChallengeForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '90-Day Challenge',
      description: '',
      activity_name: 'Workout',
      activity_category: 'fitness',
      measurement_type: 'duration_minutes',
      daily_target_value: 30,
      daily_target_unit: 'min',
      start_date: todayStr,
      duration_days: 90,
      daily_deadline: '22:00',
      timezone: userTimezone,
      fine_amount: 5,
      currency: 'USD',
      penalty_distribution: 'equal',
      no_recipient_policy: 'carry_forward',
      proof_review_required: true,
      allow_excused_absences: false,
      max_excused_days: 3,
      grace_period_minutes: 30,
    },
  })

  const { watch, setValue, formState: { errors, isSubmitting } } = form

  const values = watch()

  const applyPreset = (preset: typeof PRESET_ACTIVITIES[0]) => {
    setValue('activity_name', preset.name, { shouldValidate: true })
    setValue('activity_category', preset.category, { shouldValidate: true })
    setValue('measurement_type', preset.measurement, { shouldValidate: true })
    setValue('daily_target_value', preset.target, { shouldValidate: true })
    setValue('daily_target_unit', preset.unit, { shouldValidate: true })
    setValue('title', `${preset.name} Challenge`, { shouldValidate: true })
  }

  const applyMeasurementType = (mt: MeasurementType) => {
    const found = MEASUREMENT_TYPES.find((m) => m.value === mt)
    if (found && found.unit) setValue('daily_target_unit', found.unit, { shouldValidate: true })
  }

  const handleNextStep1 = async () => {
    const valid = await form.trigger([
      'title',
      'activity_name',
      'activity_category',
      'measurement_type',
      'daily_target_value',
      'daily_target_unit',
    ])
    if (valid) {
      setStep(2)
    } else {
      toast({
        title: 'Please check activity details',
        description: 'Ensure title, activity name, and target amount are filled out.',
        variant: 'destructive',
      })
    }
  }

  const handleNextStep2 = async () => {
    const valid = await form.trigger([
      'start_date',
      'duration_days',
      'daily_deadline',
      'grace_period_minutes',
      'timezone',
    ])
    if (valid) {
      setStep(3)
    } else {
      toast({
        title: 'Please check schedule',
        description: 'Ensure start date, duration, and daily deadline are valid.',
        variant: 'destructive',
      })
    }
  }

  const handleNextStep3 = async () => {
    const valid = await form.trigger([
      'fine_amount',
      'currency',
      'penalty_distribution',
      'no_recipient_policy',
      'proof_review_required',
      'allow_excused_absences',
      'max_excused_days',
    ])
    if (valid) {
      setStep(4)
    } else {
      toast({
        title: 'Please check rules',
        description: 'Ensure fine amount and penalty rules are valid.',
        variant: 'destructive',
      })
    }
  }

  const onInvalid = (errors: any) => {
    console.warn('Form validation failed:', errors)
    const errorKeys = Object.keys(errors)
    if (errorKeys.length > 0) {
      const firstKey = errorKeys[0]
      const msg = errors[firstKey]?.message || `Please check field: ${firstKey}`
      toast({
        title: 'Incomplete or invalid fields',
        description: String(msg),
        variant: 'destructive',
      })

      const step1Fields = ['title', 'activity_name', 'activity_category', 'measurement_type', 'daily_target_value', 'daily_target_unit']
      const step2Fields = ['start_date', 'duration_days', 'daily_deadline', 'grace_period_minutes', 'timezone']
      const step3Fields = ['fine_amount', 'currency', 'penalty_distribution', 'no_recipient_policy', 'proof_review_required', 'allow_excused_absences', 'max_excused_days']

      if (step1Fields.includes(firstKey)) {
        setStep(1)
      } else if (step2Fields.includes(firstKey)) {
        setStep(2)
      } else if (step3Fields.includes(firstKey)) {
        setStep(3)
      }
    }
  }

  const onSubmit = async (data: ChallengeForm) => {
    const currentUser = user ?? (await supabase.auth.getUser()).data?.user
    if (!currentUser) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create a challenge.',
        variant: 'destructive',
      })
      navigate('/login')
      return
    }

    try {
      const formattedDeadline = data.daily_deadline.length === 5 
        ? `${data.daily_deadline}:00` 
        : data.daily_deadline

      // Create the challenge
      const challengePayload = {
        creator_id: currentUser.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        activity_name: data.activity_name.trim(),
        activity_category: data.activity_category,
        measurement_type: data.measurement_type,
        custom_measurement_unit: data.custom_measurement_unit?.trim() || null,
        daily_target_value: data.daily_target_value,
        daily_target_unit: data.daily_target_unit.trim(),
        start_date: data.start_date,
        duration_days: data.duration_days,
        daily_deadline: formattedDeadline,
        timezone: data.timezone || 'UTC',
        fine_amount: data.fine_amount ?? 0,
        currency: (data.currency || 'USD').toUpperCase().trim(),
        penalty_distribution: data.penalty_distribution,
        no_recipient_policy: data.no_recipient_policy,
        proof_review_required: !!data.proof_review_required,
        allow_excused_absences: !!data.allow_excused_absences,
        max_excused_days: data.max_excused_days ?? 3,
        grace_period_minutes: data.grace_period_minutes ?? 30,
        status: 'active' as const,
        invitation_link_token: generateInviteToken(),
        invitation_link_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        current_rule_version: 1,
      }

      console.log('Inserting challenge:', challengePayload)

      const { data: challenge, error } = await supabase
        .from('challenges')
        .insert(challengePayload)
        .select()
        .single()

      if (error) {
        console.error('Challenge insert error:', error)
        throw error
      }

      // Add creator as participant (accepted)
      const { error: partErr } = await supabase.from('challenge_participants').insert({
        challenge_id: challenge.id,
        user_id: currentUser.id,
        status: 'accepted',
        rule_version_accepted: 1,
        accepted_at: new Date().toISOString(),
      })
      if (partErr) console.warn('Participant insert warning:', partErr)

      // Save initial rule version
      const { error: ruleErr } = await supabase.from('challenge_rule_versions').insert({
        challenge_id: challenge.id,
        version: 1,
        rule_snapshot: data as any,
        changed_by: currentUser.id,
        change_reason: 'Initial challenge creation',
      })
      if (ruleErr) console.warn('Rule version insert warning:', ruleErr)

      // If challenge starts today or earlier, create today's daily record for creator
      if (data.start_date <= todayStr) {
        await supabase.from('daily_challenge_records').insert({
          challenge_id: challenge.id,
          user_id: currentUser.id,
          record_date: todayStr,
          status: 'pending',
          target_value: data.daily_target_value,
        })
      }

      toast({ title: 'Challenge created! 🎉', description: 'Now invite your friends to join.' })
      navigate(`/challenges/${challenge.id}/invite`)
    } catch (err: any) {
      console.error('Failed to create challenge:', err)
      toast({
        title: 'Failed to create challenge',
        description: err.message || 'An error occurred while creating the challenge',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="page-container py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {step > 1 ? 'Back' : 'Cancel'}
        </button>
        <h1 className="text-2xl font-bold">Create a Challenge</h1>
        <p className="text-muted-foreground text-sm mt-1">Build your accountability pact, step by step</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className="flex items-center gap-2 flex-1 text-left group cursor-pointer"
          >
            <div className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              step >= s.id ? 'bg-gradient-streak' : 'bg-muted group-hover:bg-muted-foreground/30'
            }`} />
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              step === s.id
                ? 'bg-gradient-streak text-white ring-2 ring-primary ring-offset-2 ring-offset-background'
                : step > s.id
                ? 'bg-primary/20 text-primary'
                : 'bg-muted text-muted-foreground group-hover:text-foreground'
            }`}>
              {s.id}
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
        {/* Step 1: Activity */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Quick Presets</CardTitle>
                <CardDescription>Start from a popular challenge type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_ACTIVITIES.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="flex items-center gap-2 p-3 rounded-xl border hover:border-primary/50 hover:bg-accent transition-all text-left text-sm"
                    >
                      <span className="text-xl">{getCategoryEmoji(p.category)}</span>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.target} {p.unit}/day</div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Challenge Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Challenge Title *</label>
                  <Input
                    placeholder="e.g. Morning Run Challenge"
                    error={errors.title?.message}
                    {...form.register('title')}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    placeholder="Optional description of your challenge..."
                    {...form.register('description')}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Activity Name *</label>
                  <Input
                    placeholder="e.g. Running, Meditation, Reading"
                    error={errors.activity_name?.message}
                    {...form.register('activity_name')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setValue('activity_category', cat.value)}
                        className={`flex flex-col items-center p-2 rounded-xl border text-xs gap-1 transition-all ${
                          values.activity_category === cat.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <span className="text-lg">{cat.emoji}</span>
                        <span className="leading-tight text-center">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Target</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Measurement Type</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {MEASUREMENT_TYPES.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => {
                          setValue('measurement_type', m.value)
                          applyMeasurementType(m.value)
                        }}
                        className={`px-3 py-2 rounded-xl border text-xs text-left transition-all ${
                          values.measurement_type === m.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-sm font-medium">Target Amount *</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="30"
                      error={errors.daily_target_value?.message}
                      {...form.register('daily_target_value', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-sm font-medium">Unit *</label>
                    <Input
                      placeholder="min"
                      error={errors.daily_target_unit?.message}
                      {...form.register('daily_target_unit')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="button"
              variant="streak"
              className="w-full"
              onClick={handleNextStep1}
            >
              Next: Schedule <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Challenge Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Start Date *</label>
                    <Input
                      type="date"
                      min={todayStr}
                      error={errors.start_date?.message}
                      {...form.register('start_date')}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Duration (days) *</label>
                    <Input
                      type="number"
                      min={7}
                      max={365}
                      error={errors.duration_days?.message}
                      {...form.register('duration_days', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Quick duration presets */}
                <div className="flex gap-2">
                  {[30, 60, 90, 100].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setValue('duration_days', d)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        values.duration_days === d
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Daily Deadline *</label>
                    <Input
                      type="time"
                      error={errors.daily_deadline?.message}
                      {...form.register('daily_deadline')}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Grace Period (min)</label>
                    <Input
                      type="number"
                      min={0}
                      max={1440}
                      {...form.register('grace_period_minutes', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium">Challenge Timezone</label>
                  <Input
                    placeholder="e.g. America/New_York"
                    {...form.register('timezone')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Detected: {userTimezone}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button type="button" variant="streak" className="w-full" onClick={handleNextStep2}>
              Next: Rules & Fines <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Rules & Fines */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Financial Penalties</CardTitle>
                <CardDescription>Agree on consequences for missing targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Fine Amount</label>
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="5.00"
                      error={errors.fine_amount?.message}
                      {...form.register('fine_amount', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Currency</label>
                    <Input placeholder="USD" maxLength={3} {...form.register('currency')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fine Distribution</label>
                  {[
                    { value: 'equal', label: 'Equal split', desc: 'Fine split equally among those who completed' },
                    { value: 'proportional', label: 'Proportional', desc: 'Split by completion percentage' },
                    { value: 'winner', label: 'Top performer', desc: 'Fine goes to the best performer that day' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:border-primary/40 transition-all">
                      <input
                        type="radio"
                        value={opt.value}
                        {...form.register('penalty_distribution')}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">If No One Completes That Day</label>
                  {[
                    { value: 'carry_forward', label: 'Carry forward', desc: 'Fines accumulate for next completion day' },
                    { value: 'void', label: 'Void the fine', desc: 'No fines on days everyone misses' },
                    { value: 'charity', label: 'To charity', desc: 'Fines go to a designated charity' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer hover:border-primary/40 transition-all">
                      <input
                        type="radio"
                        value={opt.value}
                        {...form.register('no_recipient_policy')}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-muted-foreground">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proof & Dispute Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('proof_review_required')}
                    className="accent-primary h-4 w-4"
                  />
                  <div>
                    <div className="text-sm font-medium">Require peer review of submissions</div>
                    <div className="text-xs text-muted-foreground">Members must approve each other's proof</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('allow_excused_absences')}
                    className="accent-primary h-4 w-4"
                  />
                  <div>
                    <div className="text-sm font-medium">Allow excused absences</div>
                    <div className="text-xs text-muted-foreground">Members can request excused days (with approval)</div>
                  </div>
                </label>

                {values.allow_excused_absences && (
                  <div className="space-y-1 pl-7">
                    <label className="text-sm font-medium">Max excused days</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      className="w-32"
                      {...form.register('max_excused_days', { valueAsNumber: true })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="button" variant="streak" className="w-full" onClick={handleNextStep3}>
              Review Challenge <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card>
              <div className={`h-2 bg-gradient-to-r ${getGradientForCategory(values.activity_category)}`} />
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getGradientForCategory(values.activity_category)} flex items-center justify-center text-2xl`}>
                    {getCategoryEmoji(values.activity_category)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{values.title || 'Unnamed Challenge'}</h2>
                    <p className="text-sm text-muted-foreground">{values.activity_name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Daily Target', value: `${values.daily_target_value} ${values.daily_target_unit}` },
                    { label: 'Duration', value: `${values.duration_days} days` },
                    { label: 'Start Date', value: values.start_date },
                    { label: 'Daily Deadline', value: values.daily_deadline },
                    { label: 'Daily Fine', value: values.fine_amount > 0 ? `${values.currency} ${values.fine_amount}` : 'No fine' },
                    { label: 'Distribution', value: values.penalty_distribution },
                    { label: 'Timezone', value: values.timezone },
                    { label: 'Grace Period', value: `${values.grace_period_minutes} min` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {values.description && (
                  <p className="text-sm text-muted-foreground border-t pt-3">{values.description}</p>
                )}
              </CardContent>
            </Card>

            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 flex gap-3 text-sm">
              <Info className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-muted-foreground">
                Once you create this challenge, it will be in <strong>Pending</strong> status. Invite friends and the challenge starts when they accept the rules. You can still edit rules before participants accept.
              </p>
            </div>

            <Button type="submit" variant="streak" className="w-full" size="lg" loading={isSubmitting}>
              Create Challenge & Invite Friends 🎉
            </Button>
          </motion.div>
        )}
      </form>
    </div>
  )
}
