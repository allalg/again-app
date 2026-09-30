import { motion } from 'framer-motion'
import { ExhibitionMark } from '@/components/ui/EditorialArt'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo */}
        <div className="relative">
          <div className="h-16 w-16 rounded-full border border-primary/40 bg-card flex items-center justify-center text-primary shadow-sm">
            <ExhibitionMark className="h-9 w-9" />
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-full animate-pulse-ring" />
        </div>

        {/* Brand name */}
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold tracking-wider text-foreground">A GAIN</h1>
          <p className="font-cinzel text-xs text-muted-foreground uppercase tracking-widest mt-1">Do it again. Make a gain.</p>
        </div>

        {/* Loading dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
