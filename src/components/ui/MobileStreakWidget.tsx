import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Camera, Plus, Share2, Smartphone, Check, X, ArrowUpRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ExhibitionMark } from '@/components/ui/EditorialArt'
import { cn } from '@/lib/utils'

interface MobileStreakWidgetProps {
  currentStreak: number
  totalChallenges: number
  pendingCount: number
  firstPendingId?: string
  firstPendingTitle?: string
}

export function MobileStreakWidget({
  currentStreak,
  totalChallenges,
  pendingCount,
  firstPendingId,
  firstPendingTitle,
}: MobileStreakWidgetProps) {
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect if already installed as PWA / home screen widget
    const isApp = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    setIsStandalone(!!isApp)

    // Listen for Android beforeinstallprompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      setShowInstallGuide(true)
    }
  }

  const completedToday = totalChallenges - pendingCount
  const isComplete = totalChallenges > 0 && pendingCount === 0

  return (
    <>
      {/* Phone Widget Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/90 bg-card p-5 shadow-[0_4px_20px_rgba(34,29,25,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        
        {/* Subtle Background Watermark */}
        <div className="absolute -right-4 -bottom-6 opacity-5 pointer-events-none text-foreground">
          <ExhibitionMark className="w-36 h-36" />
        </div>

        {/* Widget Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cinnabar-500 animate-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              DAILY STREAK WIDGET
            </span>
          </div>

          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-accent/50 text-[10px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <Smartphone className="h-3 w-3 text-cinnabar-500" />
              <span>Add to Home Screen</span>
            </button>
          )}
        </div>

        {/* Main Widget Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          
          {/* Left: Streak Counter */}
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl border border-cinnabar-500/30 bg-cinnabar-500/10 text-cinnabar-600 dark:text-cinnabar-400 shadow-sm flex-shrink-0">
              <Flame className="w-8 h-8 fill-current" />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-cinnabar-600 text-white font-mono text-[9px] font-bold">
                DAY
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-serif text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                  {currentStreak}
                </span>
                <span className="font-serif text-sm italic text-muted-foreground">
                  {currentStreak === 1 ? 'day streak' : 'days streak'}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                {isComplete
                  ? 'All tasks checked today! 🎉'
                  : pendingCount > 0
                  ? `${pendingCount} proof upload${pendingCount > 1 ? 's' : ''} left today`
                  : 'Start a challenge to begin your streak'}
              </p>
            </div>
          </div>

          {/* Right: Quick Action Upload */}
          <div className="flex items-center sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
            {pendingCount > 0 && firstPendingId ? (
              <Button
                variant="cinnabar"
                size="default"
                asChild
                className="w-full sm:w-auto font-cinzel text-xs tracking-wider uppercase shadow-md gap-2"
              >
                <Link to={`/challenges/${firstPendingId}/submit`}>
                  <Camera className="h-4 w-4" />
                  <span>Upload Proof Now</span>
                </Link>
              </Button>
            ) : totalChallenges > 0 ? (
              <Button
                variant="outline"
                size="default"
                asChild
                className="w-full sm:w-auto font-cinzel text-xs tracking-wider uppercase gap-1.5"
              >
                <Link to="/challenges/new">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Streak</span>
                </Link>
              </Button>
            ) : (
              <Button
                variant="cinnabar"
                size="default"
                asChild
                className="w-full sm:w-auto font-cinzel text-xs tracking-wider uppercase gap-1.5"
              >
                <Link to="/challenges/new">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Start First Challenge</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Micro-Progress Bar */}
        {totalChallenges > 0 && (
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Today's Completion:</span>
              <span className="font-bold text-foreground">{completedToday} / {totalChallenges}</span>
            </div>
            {firstPendingTitle && pendingCount > 0 && (
              <span className="truncate max-w-[200px] text-cinnabar-600 dark:text-cinnabar-400">
                Next: {firstPendingTitle}
              </span>
            )}
          </div>
        )}
      </div>

      {/* "Add to Home Screen" Instruction Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/80">
                <div className="flex items-center gap-2.5">
                  <ExhibitionMark className="w-6 h-6 text-primary" />
                  <span className="font-serif text-lg font-bold text-foreground">Add A GAIN to Home Screen</span>
                </div>
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="font-serif text-sm text-muted-foreground leading-relaxed">
                Add A GAIN directly to your phone's home screen. It will open full-screen like a native app, with quick access to your streaks and 1-tap photo uploads!
              </p>

              <div className="space-y-3 font-mono text-xs">
                {/* iPhone / Safari */}
                <div className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-1">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>🍏 iPhone (Safari)</span>
                    <span className="text-[10px] text-cinnabar-500 uppercase">3 taps</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    1. Tap the <Share2 className="inline h-3 w-3 text-primary mx-1" /> <strong>Share</strong> button at bottom of Safari.<br />
                    2. Scroll down and tap <strong>"Add to Home Screen"</strong>.<br />
                    3. Tap <strong>Add</strong> in top right. Done!
                  </p>
                </div>

                {/* Android / Chrome */}
                <div className="p-3 rounded-xl border border-border/80 bg-muted/40 space-y-1">
                  <div className="flex items-center justify-between font-bold text-foreground">
                    <span>🤖 Android (Chrome)</span>
                    <span className="text-[10px] text-botanical-500 uppercase">2 taps</span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    1. Tap the <strong>⋮ (three dots)</strong> menu in top-right.<br />
                    2. Tap <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.<br />
                    3. Confirm and open directly from your home screen.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="cinnabar"
                  className="w-full font-cinzel text-xs uppercase tracking-wider"
                  onClick={() => setShowInstallGuide(false)}
                >
                  Got It!
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
