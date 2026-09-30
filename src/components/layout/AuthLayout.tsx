import { Outlet, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { ExhibitionMark } from '@/components/ui/EditorialArt'

export function AuthLayout() {
  const { user, isInitialized } = useAuthStore()
  const hasAuthCode = typeof window !== 'undefined' && (
    window.location.search.includes('code=') ||
    window.location.hash.includes('access_token=')
  )

  if (hasAuthCode) {
    return <LoadingScreen />
  }

  if (isInitialized && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel (decorative, hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-streak-900 via-streak-800 to-blue-900">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-streak-500/20 blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-500/20 blur-3xl animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="text-white">
              <ExhibitionMark className="w-8 h-8" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-wider">A GAIN</span>
              <span className="font-cinzel text-[9px] uppercase tracking-widest block text-white/80">DAILY STREAKS</span>
            </div>
          </Link>

          {/* Hero copy */}
          <div className="space-y-6">
            <motion.h1
              className="text-5xl font-serif font-normal leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Do it again.<br />Make a gain.
            </motion.h1>
            <motion.p
              className="text-lg text-white/70 leading-relaxed max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              Challenge your friends to 90-day accountability pacts. Submit daily photo proof, track your streaks, and back it all with real financial stakes.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              className="flex flex-wrap gap-2 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {['📸 Photo Proof', '🔥 Daily Streaks', '💰 Penalty Ledger', '💬 Group Chat'].map((f) => (
                <span key={f} className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium">
                  {f}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active Challenges', value: '10K+' },
              { label: 'Completion Rate', value: '73%' },
              { label: 'Penalties Avoided', value: '$2M+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-white/60 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel (form) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 min-h-screen">
        {/* Mobile logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <ExhibitionMark className="w-7 h-7 text-primary" />
          <span className="font-serif text-xl font-bold tracking-wider text-foreground">A GAIN</span>
        </Link>

        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
