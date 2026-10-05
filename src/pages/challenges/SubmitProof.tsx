import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Camera, X, CheckCircle2, AlertCircle, ArrowLeft,
  Image, ZoomIn, Clock, Target, Github, Link as LinkIcon, ExternalLink, Code
} from 'lucide-react'
import { supabase, uploadFile, getSignedUrl } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Progress } from '@/components/ui/Progress'
import { toast } from '@/components/ui/Toaster'
import { LiveCameraCapture } from '@/components/ui/LiveCameraCapture'
import { validateImageFile, generateStoragePath, formatDeadline, isDeadlinePast, extractUrl, isGithubUrl, parseGithubRepoName } from '@/lib/utils'
import { syncParticipantStreak } from '@/lib/streak'

interface UploadedFile {
  file: File
  preview: string
  error?: string
  uploading?: boolean
  path?: string
}

export function SubmitProofPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuthStore()
  const navigate = useNavigate()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [showCameraModal, setShowCameraModal] = useState(false)
  const [proofLink, setProofLink] = useState('')
  const [measuredValue, setMeasuredValue] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)


  const handleCameraCapture = (file: File) => {
    const validation = validateImageFile(file)
    setFiles((prev) => [
      ...prev,
      {
        file,
        preview: URL.createObjectURL(file),
        error: validation.error,
      },
    ].slice(0, 5))
    toast({ title: 'Photo captured! 📸', description: 'Photo taken directly in memory (not saved to gallery).' })
  }

  const today = new Date().toISOString().split('T')[0]

  // Fetch today's record and challenge
  const { data: challenge } = useQuery({
    queryKey: ['challenge', id],
    queryFn: async () => {
      const { data } = await supabase.from('challenges').select('*').eq('id', id!).single()
      return data
    },
    enabled: !!id,
  })

  const { data: todayRecord } = useQuery({
    queryKey: ['today-record', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('daily_challenge_records')
        .select(`
          *,
          submissions:proof_submissions(
            *,
            attachments:proof_attachments(*),
            reviews:proof_reviews(*)
          )
        `)
        .eq('challenge_id', id!)
        .eq('user_id', user!.id)
        .eq('challenge_day', today)
        .maybeSingle()
      return data
    },
    enabled: !!id && !!user,
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = []
    for (const file of acceptedFiles) {
      const validation = validateImageFile(file)
      newFiles.push({
        file,
        preview: URL.createObjectURL(file),
        error: validation.error,
      })
    }
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5)) // max 5 photos
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/heic': ['.heic', '.heif'],
    },
    maxFiles: 5,
    disabled: isSubmitting,
  })

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  // Auto-fill measuredValue with daily target if empty
  useEffect(() => {
    if (challenge?.daily_target_value && !measuredValue) {
      setMeasuredValue(String(challenge.daily_target_value))
    }
  }, [challenge?.daily_target_value])

  const isTechOrLinkUnit = ['repo', 'project', 'commit', 'pr', 'link', 'code'].includes(
    (challenge?.daily_target_unit || '').toLowerCase()
  ) || challenge?.measurement_type === 'custom'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast({ title: 'Authentication required', description: 'Please sign in to submit proof.', variant: 'destructive' })
      return
    }
    if (!challenge) {
      toast({ title: 'Challenge loading', description: 'Please wait for challenge details to load.', variant: 'destructive' })
      return
    }

    const validFiles = files.filter((f) => !f.error)
    const hasPhoto = validFiles.length > 0
    const trimmedLink = proofLink.trim()
    const trimmedNotes = notes.trim()

    // Must provide at least one proof element
    if (!hasPhoto && !trimmedLink && !trimmedNotes) {
      toast({
        title: 'Proof of work required',
        description: 'Please provide at least a GitHub repo link, notes description, or photo proof.',
        variant: 'destructive',
      })
      return
    }

    if (files.length > 0 && validFiles.length === 0) {
      toast({ title: 'Invalid files', description: 'Please remove invalid files first.', variant: 'destructive' })
      return
    }

    const value = parseFloat(measuredValue)
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Invalid measurement', description: `Please enter the amount of ${challenge.daily_target_unit} achieved.`, variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    setUploadProgress(0)

    try {
      // 1. Ensure daily_challenge_records exists for today
      let recordId = todayRecord?.id
      if (!recordId) {
        const { data: part, error: partErr } = await supabase
          .from('challenge_participants')
          .select('id')
          .eq('challenge_id', id!)
          .eq('user_id', user.id)
          .maybeSingle()

        if (partErr || !part) {
          throw new Error('You are not registered as a participant in this challenge.')
        }

        const start = new Date(challenge.start_date || today)
        const now = new Date(today)
        const dayDiff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        const dayNumber = Math.max(1, dayDiff + 1)
        const deadlineTime = challenge.daily_deadline || '23:59:00'
        const deadlineIso = `${today}T${deadlineTime.length === 5 ? deadlineTime + ':00' : deadlineTime}`
        const deadlineUtc = new Date(deadlineIso).toISOString()

        const { data: newRec, error: recErr } = await supabase
          .from('daily_challenge_records')
          .upsert({
            challenge_id: id!,
            participant_id: part.id,
            user_id: user.id,
            challenge_day: today,
            day_number: dayNumber,
            status: 'pending',
            deadline_utc: deadlineUtc,
          }, { onConflict: 'challenge_id,user_id,challenge_day' })
          .select()
          .single()

        if (recErr) throw recErr
        recordId = newRec.id
      }

      // Compute cumulative measurement for today
      const combinedTotal = totalLoggedToday + value
      const meetsTarget = combinedTotal >= challenge.daily_target_value

      // Combine link and notes cleanly
      let finalNotes = trimmedNotes
      if (trimmedLink) {
        const fullUrl = trimmedLink.startsWith('http://') || trimmedLink.startsWith('https://')
          ? trimmedLink
          : `https://${trimmedLink}`
        finalNotes = finalNotes ? `🔗 ${fullUrl}\n\n${finalNotes}` : `🔗 ${fullUrl}`
      }

      // 2. Create submission record
      const { data: submission, error: submissionError } = await supabase
        .from('proof_submissions')
        .insert({
          daily_record_id: recordId,
          challenge_id: id!,
          user_id: user.id,
          measured_value: value,
          measured_unit: challenge.daily_target_unit,
          notes: finalNotes || null,
          is_active: true,
          meets_target: meetsTarget,
        })
        .select()
        .single()

      if (submissionError) throw submissionError

      // 3. Upload photos (only if photos were attached)
      if (validFiles.length > 0) {
        const totalFiles = validFiles.length
        for (let i = 0; i < totalFiles; i++) {
          const f = validFiles[i]
          const path = generateStoragePath(id!, user.id, f.file.name)

          try {
            await uploadFile('proof-photos', path, f.file, { upsert: true })
          } catch (uploadErr: any) {
            console.warn('Storage upload note:', uploadErr.message)
          }

          await supabase.from('proof_attachments').insert({
            submission_id: submission.id,
            storage_path: path,
            file_name: f.file.name,
            file_size_bytes: f.file.size,
            mime_type: f.file.type,
            upload_order: i + 1,
          })

          setUploadProgress(Math.round(((i + 1) / totalFiles) * 100))
        }
      }

      // 4. Update daily record status:
      // If proof review required, set 'submitted' for peer review (or reset from disputed/rejected)
      const nextStatus = challenge.proof_review_required
        ? 'submitted'
        : (meetsTarget ? 'completed' : 'incomplete')


      await supabase
        .from('daily_challenge_records')
        .update({
          status: nextStatus,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', recordId)

      // 5. Update participant streak & stats
      if (meetsTarget && !challenge.proof_review_required) {
        try {
          // Attempt database RPC if available
          const { error: rpcErr } = await supabase.rpc('update_participant_streak', {
            p_challenge_id: id!,
            p_user_id: user.id,
            p_completed: true,
          })
          if (rpcErr) {
            console.warn('RPC update_participant_streak failed, falling back to sync:', rpcErr.message)
          }
        } catch {
          // Ignore RPC exception
        }
        // Always run syncParticipantStreak to ensure accurate counts from daily records
        await syncParticipantStreak(id!, user.id)
      }

      // 6. Notify challenge peers that proof was submitted for review
      const peers = challenge.participants?.filter((p: any) => p.user_id !== user.id && p.status === 'accepted') || []
      for (const peer of peers) {
        try {
          await supabase.from('notifications').insert({
            user_id: peer.user_id,
            type: 'submission_received',
            title: isDisputed ? 'Proof Re-submitted 🔄' : 'New Proof to Review 📸',
            body: `${user.user_metadata?.display_name || 'Your partner'} logged ${value} ${challenge.daily_target_unit} for "${challenge.title}". Click to verify!`,
            data: {
              challenge_id: id,
              record_id: recordId,
              submission_id: submission.id,
              route: `/challenges/${id}`,
            },
          })
        } catch (notifErr) {
          console.warn('Peer notification notice:', notifErr)
        }
      }

      toast({
        title: isDisputed 
          ? 'Proof re-submitted! 🔄' 
          : (totalLoggedToday > 0 ? 'Additional activity logged! 📈' : 'Proof submitted! 🎉'),
        description: `Logged ${value} ${challenge.daily_target_unit} (Total today: ${combinedTotal} ${challenge.daily_target_unit}).`,
      })

      navigate(`/challenges/${id}`)
    } catch (err: any) {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Extract submissions list
  const rawSubmissions: any = todayRecord?.submissions || (todayRecord as any)?.submission || []
  const submissionsList: any[] = Array.isArray(rawSubmissions)
    ? rawSubmissions
    : (rawSubmissions ? [rawSubmissions] : [])

  const activeSubmissions = submissionsList.filter((s) => s.is_active !== false)
  const totalLoggedToday = activeSubmissions.reduce((sum, s) => sum + Number(s.measured_value || 0), 0)
  const isDisputed = todayRecord?.status === 'disputed'
  const isCompleted = todayRecord?.status === 'completed'
  const isPastDeadline = todayRecord?.deadline_utc ? isDeadlinePast(todayRecord.deadline_utc) : false

  const latestRejection = submissionsList
    .flatMap((s) => s.reviews || [])
    .filter((r: any) => r.verdict === 'rejected')
    .pop()

  return (
    <div className="page-container py-6 max-w-xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Challenge
      </button>

      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold">
          {isDisputed ? 'Retry / Re-submit Proof 🔄' : totalLoggedToday > 0 ? 'Log Additional Activity' : "Submit Today's Proof"}
        </h1>
        {challenge && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" />
              Daily Target: {challenge.daily_target_value} {challenge.daily_target_unit}
            </div>
            {todayRecord && (
              <div className={`flex items-center gap-1.5 ${isPastDeadline ? 'text-red-500' : ''}`}>
                <Clock className="h-3.5 w-3.5" />
                Deadline: {formatDeadline(todayRecord.deadline_utc, profile?.timezone ?? 'UTC')}
                {isPastDeadline && ' (PASSED)'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Disputed / Rejected Banner */}
      {isDisputed && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 flex gap-3 mb-6 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm text-red-500">Previous Proof Was Rejected</p>
            <p className="text-xs text-muted-foreground">
              {latestRejection?.reason ? `Feedback: "${latestRejection.reason}"` : 'Your peer requested clearer proof or a re-try.'}
            </p>
            <p className="text-xs text-foreground font-medium pt-1">
              Upload a new photo and measurement below to re-submit for approval.
            </p>
          </div>
        </div>
      )}

      {/* Multiple Submissions / Accumulated Progress Card */}
      {totalLoggedToday > 0 && (
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-jade-500" />
              Today's Logged Progress
            </span>
            <span className="text-xs font-bold text-primary">
              {totalLoggedToday} / {challenge?.daily_target_value} {challenge?.daily_target_unit}
            </span>
          </div>

          <Progress
            value={Math.min(100, Math.round((totalLoggedToday / (challenge?.daily_target_value || 1)) * 100))}
            variant="streak"
          />

          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-muted-foreground font-medium">Logged entries today ({activeSubmissions.length}):</p>
            <div className="flex flex-wrap gap-1.5">
              {activeSubmissions.map((s, idx) => (
                <div key={s.id || idx} className="text-[11px] px-2.5 py-1 rounded-lg bg-card border flex items-center gap-1 text-muted-foreground">
                  <span>Entry #{idx + 1}:</span>
                  <strong className="text-foreground">{s.measured_value} {s.measured_unit}</strong>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground pt-1">
              💡 Running or exercising multiple times today? Log below to add to your daily total!
            </p>
          </div>
        </div>
      )}

      {/* Past deadline warning */}
      {isPastDeadline && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex gap-3 mb-6">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm text-red-600 dark:text-red-400">Deadline has passed</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Late submissions may still be recorded but will be marked as incomplete.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GitHub / Project Proof Link Section */}
        <div className={`space-y-2 p-4 rounded-2xl border transition-all ${
          isTechOrLinkUnit
            ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-sm'
            : 'border-border bg-card'
        }`}>
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold flex items-center gap-2">
              <Github className="h-4 w-4 text-primary" />
              <span>GitHub Repo or Project Link {isTechOrLinkUnit ? '(Proof of Work)' : '(Optional)'}</span>
            </label>
            {isTechOrLinkUnit && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/20 text-primary">
                Daily Unit: {challenge?.daily_target_unit}
              </span>
            )}
          </div>
          <div className="relative">
            <Input
              type="url"
              placeholder="https://github.com/your-username/day-1-project"
              value={proofLink}
              onChange={(e) => setProofLink(e.target.value)}
              className="pr-9 font-mono text-xs"
            />
            {proofLink && (
              <button
                type="button"
                onClick={() => setProofLink('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {proofLink.trim() && (
            <div className="flex items-center justify-between text-xs pt-1">
              {isGithubUrl(proofLink) ? (
                <span className="text-jade-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Valid GitHub: {parseGithubRepoName(proofLink) || proofLink}
                </span>
              ) : (
                <span className="text-primary font-medium flex items-center gap-1">
                  <LinkIcon className="h-3.5 w-3.5" /> Project Link Provided
                </span>
              )}
              <a
                href={proofLink.startsWith('http') ? proofLink : `https://${proofLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Test link <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {isTechOrLinkUnit
              ? 'Paste your repository URL, PR, or live tech demo link. Peers can inspect your code directly.'
              : 'Optional: share a GitHub repository, pull request, or web link to document your daily work.'}
          </p>
        </div>

        {/* Measured value */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium" htmlFor="measured-value">
              Measured Result *
            </label>
            {/* Quick chips if repo/tech unit */}
            {isTechOrLinkUnit && (
              <div className="flex gap-1 items-center">
                <span className="text-[10px] text-muted-foreground mr-1">Quick:</span>
                {[1, 2, 3].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMeasuredValue(String(val))}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      parseFloat(measuredValue) === val
                        ? 'bg-primary text-primary-foreground border-primary font-bold'
                        : 'text-muted-foreground hover:text-foreground border-border bg-card'
                    }`}
                  >
                    {val} {challenge?.daily_target_unit}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              id="measured-value"
              type="number"
              step={isTechOrLinkUnit ? '1' : '0.1'}
              min="0.1"
              placeholder={`e.g. ${challenge?.daily_target_value ?? '1'}`}
              value={measuredValue}
              onChange={(e) => setMeasuredValue(e.target.value)}
              className="flex-1"
              required
            />
            <div className="flex items-center px-4 rounded-xl border bg-muted text-sm font-medium text-muted-foreground whitespace-nowrap">
              {challenge?.daily_target_unit ?? 'units'}
            </div>
          </div>
          {challenge && measuredValue && (
            <div className={`text-xs mt-1 font-medium ${
              parseFloat(measuredValue) >= challenge.daily_target_value
                ? 'text-jade-500'
                : 'text-red-500'
            }`}>
              {parseFloat(measuredValue) >= challenge.daily_target_value
                ? `✓ Meets target (${challenge.daily_target_value} ${challenge.daily_target_unit})`
                : `✗ Below target — needs ${challenge.daily_target_value} ${challenge.daily_target_unit}`}
            </div>
          )}
        </div>

        {/* Description / Notes */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="notes">
            Description / Work Notes {proofLink ? '(Optional)' : '(Recommended)'}
          </label>
          <textarea
            id="notes"
            className="flex min-h-[90px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            placeholder={isTechOrLinkUnit ? "What did you build today? Key features, tech stack used, or challenges overcome..." : "How did it go? Any challenges today?"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground px-1">
            <span>Provide details for your accountability partner</span>
            <span>{notes.length}/500</span>
          </div>
        </div>

        {/* Photo upload section (Now optional if link or description provided) */}
        <div className="space-y-3 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <span>Proof Photos</span>
              <span className="text-xs text-muted-foreground font-normal">
                {proofLink.trim() || notes.trim() ? '(Optional)' : '(Recommended)'} · {files.length}/5
              </span>
            </label>
            <span className="font-mono text-[10px] text-cinnabar-600 dark:text-cinnabar-400 font-semibold">
              LIVE CAPTURE READY
            </span>
          </div>

          {/* Primary Action: Direct Live In-App Camera (NOT saved to phone gallery) */}
          <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-3">
            <Button
              type="button"
              variant="cinnabar"
              size="lg"
              className="w-full gap-2 font-cinzel text-xs uppercase tracking-wider shadow-md h-12"
              onClick={() => setShowCameraModal(true)}
            >
              <Camera className="h-5 w-5" />
              <span>Take Photo With Live Camera</span>
            </Button>
            <p className="font-mono text-[11px] text-center text-muted-foreground">
              ✦ Captures in-memory directly to proof · Never saved to your phone's photo gallery
            </p>
          </div>

          {/* Secondary Option: Drag & Drop or Gallery Picker */}
          <div
            {...getRootProps()}
            className={`upload-zone py-4 ${isDragActive ? 'upload-zone-active' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground p-3">
              <Image className="h-4 w-4" />
              <span>Or click here to upload screenshot / photo from device</span>
            </div>
          </div>

          {/* Live Camera Modal */}
          <LiveCameraCapture
            isOpen={showCameraModal}
            onClose={() => setShowCameraModal(false)}
            onCapture={handleCameraCapture}
          />

          {/* Preview grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <AnimatePresence>
                {files.map((f, i) => (
                  <motion.div
                    key={i}
                    className="relative aspect-square rounded-xl overflow-hidden bg-muted border"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    <img
                      src={f.preview}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {f.error && (
                      <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                        <AlertCircle className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Upload progress */}
        {isSubmitting && uploadProgress > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading proof attachments...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} variant="streak" />
          </div>
        )}

        <Button
          type="submit"
          variant="streak"
          size="lg"
          className="w-full"
          loading={isSubmitting}
          disabled={
            isSubmitting ||
            (!files.some(f => !f.error) && !proofLink.trim() && !notes.trim()) ||
            !measuredValue ||
            parseFloat(measuredValue) <= 0
          }
        >
          {proofLink.trim() || isTechOrLinkUnit ? (
            <Github className="h-4 w-4 mr-2" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          {isDisputed
            ? 'Re-submit Proof (Retry) 🔄'
            : totalLoggedToday > 0
            ? `+ Log Additional Entry (${totalLoggedToday + (parseFloat(measuredValue) || 0)} ${challenge?.daily_target_unit ?? ''} Total)`
            : (proofLink.trim() || isTechOrLinkUnit ? 'Submit Tech Proof' : 'Submit Proof')}
        </Button>
      </form>
    </div>
  )
}
