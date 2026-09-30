import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Camera, Flame, DollarSign, Calendar,
  Trophy, ArrowRight, Check, Users, Shield, Zap,
  Sun, Moon
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/store/auth.store'
import { useTheme } from '@/contexts/ThemeContext'
import {
  ExhibitionMark, BotanicalHandEtching, SurrealistEyeMedallion,
  CelestialShellArtwork, CircularEnterStamp, ArchivalSeal
} from '@/components/ui/EditorialArt'

const challenges = [
  {
    fig: 'FIG. 01',
    emoji: '🏃',
    title: 'Daily 5K Run',
    cadence: '5 KM / Day',
    category: 'FITNESS',
    description: 'Lace up every day. Submit a GPS route capture or treadmill telemetry before midnight.',
    participants: 4,
    stake: '$10 / miss',
  },
  {
    fig: 'FIG. 02',
    emoji: '🧘',
    title: 'Morning Meditation',
    cadence: '20 Min / Day',
    category: 'MINDFULNESS',
    description: 'Centering mind before screens. Verified by timer completion screenshot or session log.',
    participants: 3,
    stake: '$5 / miss',
  },
  {
    fig: 'FIG. 03',
    emoji: '📚',
    title: 'Read Every Day',
    cadence: '25 Pages / Day',
    category: 'LEARNING',
    description: 'Continuous literary enrichment. Submit a photo of today\'s bookmarks or highlighted page.',
    participants: 6,
    stake: '$10 / miss',
  },
  {
    fig: 'FIG. 04',
    emoji: '💪',
    title: 'Strength Workout',
    cadence: '45 Min / Day',
    category: 'HEALTH',
    description: 'Consistent physical conditioning. Post a photo of your weights, gym, or post-workout log.',
    participants: 5,
    stake: '$15 / miss',
  },
]

const steps = [
  {
    num: '01',
    title: 'Choose Your Habit',
    subtitle: 'SET YOUR GOAL',
    description: 'Select running, gym, reading, meditation, or craft your custom 90-day challenge target.',
    icon: Flame,
  },
  {
    num: '02',
    title: 'Invite Friends & Set Stakes',
    subtitle: 'PEER ACCOUNTABILITY',
    description: 'Add friends to your group. Agree on a friendly missed-day penalty to keep everyone honest.',
    icon: DollarSign,
  },
  {
    num: '03',
    title: 'Submit Daily Photo Proof',
    subtitle: 'REAL EVIDENCE',
    description: 'No empty checkboxes. Take a quick photo each day to verify your activity and lock in your credit.',
    icon: Camera,
  },
  {
    num: '04',
    title: 'Do It Again — Make A Gain',
    subtitle: 'STREAK DISCIPLINE',
    description: 'Watch your consecutive streak grow day after day. Complete the full 90 days and transform your life.',
    icon: Trophy,
  },
]

const reviews = [
  {
    text: "Lost 12 kg in 90 days because I couldn't bear the thought of paying my friends $10 every morning I thought about skipping. A GAIN turned consistency into second nature.",
    author: "Raj M.",
    role: "Software Engineer",
    streak: "90 Days Streak",
  },
  {
    text: "The photo proof requirement changes everything. You can't lie to an app when you need actual photographic evidence. My reading streak is now 87 days strong.",
    author: "Elena Rostova",
    role: "Product Designer",
    streak: "87 Days Streak",
  },
  {
    text: "Our coworker group started a daily workout challenge. The missed penalty ledger kept all of us motivated. Best habit app we've ever used.",
    author: "Marcus Thorne",
    role: "Startup Founder",
    streak: "90 Days Streak",
  },
]

export function LandingPage() {
  const { user } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-cinnabar-500/20 selection:text-cinnabar-700">
      
      {/* Editorial Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/80">
        <div className="page-container flex items-center justify-between h-20">
          
          {/* Brand Mark: A GAIN */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="text-primary transition-transform duration-300 group-hover:rotate-12">
              <ExhibitionMark className="w-8 h-8" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-[0.12em] text-foreground block leading-none">
                A GAIN
              </span>
              <span className="font-cinzel text-[8px] uppercase tracking-[0.3em] text-muted-foreground block mt-1">
                DO IT AGAIN · MAKE A GAIN
              </span>
            </div>
          </Link>

          {/* Editorial Navigation */}
          <nav className="hidden lg:flex items-center gap-8 font-cinzel text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">HOW IT WORKS</a>
            <a href="#challenges" className="hover:text-foreground transition-colors">CHALLENGES</a>
            <a href="#experience" className="hover:text-foreground transition-colors">EXPERIENCE</a>
            <a href="#reviews" className="hover:text-foreground transition-colors">STORIES</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Parchment' : 'Dark'} Mode`}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-gilt-400" />
              ) : (
                <Moon className="h-4 w-4 text-stone-600" />
              )}
            </button>

            {user ? (
              <Button variant="cinnabar" size="sm" asChild>
                <Link to="/dashboard" className="gap-2 font-cinzel text-xs tracking-wider uppercase">
                  DASHBOARD <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex font-cinzel text-xs tracking-wider uppercase">
                  <Link to="/login">LOG IN</Link>
                </Button>
                <Button variant="cinnabar" size="sm" asChild>
                  <Link to="/signup" className="font-cinzel text-xs tracking-widest uppercase">
                    GET STARTED
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section: Matched to the exact artwork composition */}
      <section className="relative pt-10 pb-20 border-b border-border/80">
        <div className="page-container relative">
          
          {/* Top Label */}
          <div className="flex justify-center mb-5">
            <div className="border border-border/80 p-1 bg-card/50 shadow-sm">
              <div className="px-3 py-1 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                90-DAY HABIT &amp; STREAK PLATFORM
              </div>
            </div>
          </div>

          {/* Subtitle kicker from reference image */}
          <div className="text-center mb-3">
            <p className="font-cinzel text-xs uppercase tracking-[0.3em] text-cinnabar-600 dark:text-cinnabar-400 font-semibold">
              STEP INTO A WORLD WHERE DISCIPLINE CREATES GROWTH
            </p>
          </div>

          {/* Grid Layout identical to artwork */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: High-contrast Editorial Serif Typography */}
            <div className="lg:col-span-7 flex flex-col justify-between pt-2">
              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-[5.1rem] font-normal tracking-tight text-foreground leading-[0.98] select-none">
                <span className="block font-medium">FIND <span className="font-serif italic font-normal text-muted-foreground/80">&nbsp;YOUR</span></span>
                <span className="block font-medium text-foreground">
                  BALANCE <span className="font-serif italic text-cinnabar-600 dark:text-cinnabar-400 font-normal">&amp;</span>
                </span>
                <span className="block font-medium">DISCOVER</span>
                <span className="block font-medium text-foreground/90">THE POWER</span>
                <span className="block font-medium text-foreground">OF CREATIVE</span>
                <span className="block font-serif italic font-normal text-cinnabar-700 dark:text-cinnabar-300 pl-8">
                  SPACE.
                </span>
              </h1>

              {/* Sub-hero Row with Surrealist Eye & Circular Stamp */}
              <div className="mt-12 pt-8 border-t border-border/60 flex flex-wrap items-center gap-10">
                
                {/* Surrealist Eye Medallion from Artwork */}
                <div className="flex items-center gap-4">
                  <SurrealistEyeMedallion className="w-24 h-auto text-primary" />
                  <div className="max-w-[170px]">
                    <span className="font-cinzel text-[9px] uppercase tracking-[0.2em] text-muted-foreground block">
                      DAILY VERIFICATION
                    </span>
                    <span className="font-serif text-xs italic text-foreground/80 leading-snug block mt-0.5">
                      "Real photographic proof keeps your streak unbroken."
                    </span>
                  </div>
                </div>

                {/* Circular "ENTER ->" Stamp Button from Artwork */}
                <Link to={user ? "/dashboard" : "/signup"}>
                  <CircularEnterStamp text="ENTER" className="hover:scale-105 transition-transform" />
                </Link>

                {/* Meaning Explanation Badge */}
                <div className="border-l border-border/70 pl-6 hidden sm:block">
                  <span className="font-serif text-2xl font-bold text-foreground block">A · GAIN</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block">
                    AGAIN EVERY DAY = A GAIN
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Outstretched Botanical Hand Etching */}
            <div className="lg:col-span-5 relative flex flex-col items-center">
              
              <div className="relative w-full max-w-[380px] p-4 bg-card/40 rounded-xl border border-border/80 shadow-sm">
                
                {/* Plate Header */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/60">
                  <span className="font-mono text-[9px] tracking-widest uppercase text-muted-foreground">
                    PLATE I — THE REACH FOR GROWTH
                  </span>
                  <span className="font-cinzel text-[9px] text-cinnabar-600 dark:text-cinnabar-400 uppercase tracking-widest font-semibold">
                    DAILY EVIDENCE
                  </span>
                </div>

                {/* Classical Sanguine Hand with Botanical Climbing Vines */}
                <div className="py-2">
                  <BotanicalHandEtching className="w-full h-auto drop-shadow-sm" />
                </div>

                {/* Caption */}
                <div className="pt-3 border-t border-border/60 text-center">
                  <p className="font-serif text-xs italic text-muted-foreground">
                    "Show up again today. Make a gain tomorrow."
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Second Section: "ABOUT EXPE -RIENCE" (Exactly matching reference layout!) */}
      <section id="experience" className="py-20 border-b border-border/80 bg-card/20">
        <div className="page-container">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left side: Syllable Break Title & Description */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Syllable Break Title with Inset Picture from Reference */}
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-foreground">
                  ABOUT EXPE
                </span>

                {/* Inline Miniature Artwork Frame */}
                <span className="editorial-frame w-12 h-10 border border-foreground/30 rounded bg-muted/60 flex items-center justify-center p-1 shadow-sm">
                  <svg viewBox="0 0 40 30" className="w-full h-full text-cinnabar-500">
                    <circle cx="20" cy="15" r="9" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    <circle cx="20" cy="15" r="4" fill="currentColor" />
                    <line x1="5" y1="15" x2="35" y2="15" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 2" />
                  </svg>
                </span>

                <span className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-foreground">
                  -RIENCE
                </span>
              </div>

              {/* Editorial Description Paragraph */}
              <p className="font-cinzel text-xs uppercase tracking-[0.2em] text-foreground/80 leading-relaxed text-justify max-w-xl">
                A GAIN BRINGS TOGETHER DAILY CHALLENGES AND REAL ACCOUNTABILITY TO BUILD UNBREAKABLE HABITS. THE APP COMBINES DAILY PHOTO EVIDENCE, MUTUAL FINANCIAL STAKES, AND PEER VERIFICATION ACROSS 90 CONSECUTIVE DAYS. WHEN YOU REPEAT A DISCIPLINE AGAIN AND AGAIN, EVERY DAY BECOMES A GAIN.
              </p>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center gap-4">
                <Button variant="cinnabar" size="lg" asChild>
                  <Link to="/signup" className="gap-2 font-cinzel text-xs tracking-widest uppercase">
                    START A CHALLENGE <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="font-cinzel text-xs tracking-widest uppercase">
                  <a href="#challenges">EXPLORE HABITS</a>
                </Button>
              </div>
            </div>

            {/* Right side: Celestial Shell Artwork */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-xl border border-border/80 bg-card/60 relative overflow-hidden shadow-sm">
                
                <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-4">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    FIG. 00 — 90 DAYS CONSISTENCY
                  </span>
                  <ArchivalSeal label="UNBROKEN" number="90D" className="scale-75" />
                </div>

                {/* Celestial Shell Artwork */}
                <div className="py-2 flex justify-center">
                  <CelestialShellArtwork className="max-w-[280px]" />
                </div>

                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                  <span>90 CONSECUTIVE DAYS</span>
                  <span className="text-cinnabar-600 dark:text-cinnabar-400 font-bold">100% PHOTO PROOF</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Challenges Section */}
      <section id="challenges" className="py-20 border-b border-border/80">
        <div className="page-container">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-border/80">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cinnabar-600 dark:text-cinnabar-400 block mb-2 font-semibold">
                POPULAR CHALLENGES
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-normal">
                Four 90-Day Streaks to Master
              </h2>
            </div>
            <p className="font-serif italic text-sm text-muted-foreground max-w-sm mt-3 md:mt-0">
              Pick a ready-made challenge or create your own custom daily goal with your crew.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {challenges.map((item, idx) => (
              <div
                key={idx}
                className="exhibition-card p-6 flex flex-col justify-between group hover:-translate-y-1 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
                    <span className="figure-caption">{item.fig}</span>
                    <Badge variant="stamp">{item.category}</Badge>
                  </div>

                  <div className="text-3xl mb-3">{item.emoji}</div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="font-mono text-xs text-cinnabar-600 dark:text-cinnabar-400 font-medium mb-3">
                    {item.cadence}
                  </p>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">{item.participants} Challengers</span>
                  <span className="font-bold text-foreground">{item.stake}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" asChild className="font-cinzel text-xs tracking-widest uppercase">
              <Link to="/challenges/new">
                CREATE CUSTOM CHALLENGE →
              </Link>
            </Button>
          </div>

        </div>
      </section>

      {/* How It Works (4 Steps) */}
      <section id="how-it-works" className="py-20 border-b border-border/80 bg-card/30">
        <div className="page-container">
          
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cinnabar-600 dark:text-cinnabar-400 block mb-2 font-semibold">
              SIMPLE &amp; POWERFUL
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-normal mb-3">
              How A GAIN Works
            </h2>
            <p className="font-serif italic text-sm text-muted-foreground">
              Social accountability backed by photo evidence and real stakes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((st, idx) => {
              const Icon = st.icon
              return (
                <div key={idx} className="p-6 rounded-xl border border-border/80 bg-card/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-serif text-3xl font-bold text-cinnabar-600 dark:text-cinnabar-400">
                        {st.num}
                      </span>
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <span className="font-cinzel text-[9px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">
                      {st.subtitle}
                    </span>
                    <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
                      {st.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {st.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="py-20 border-b border-border/80">
        <div className="page-container">
          
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-cinnabar-600 dark:text-cinnabar-400 block mb-2 font-semibold">
              REAL STORIES
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-normal">
              Built on Daily Consistency
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((rev, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-border/80 bg-card/40 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                      VERIFIED CHALLENGER
                    </span>
                    <Badge variant="streak">{rev.streak}</Badge>
                  </div>
                  <p className="font-serif text-base italic leading-relaxed text-foreground/90 mb-6">
                    "{rev.text}"
                  </p>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <p className="font-serif font-semibold text-foreground text-sm">{rev.author}</p>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">{rev.role}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden bg-card/40 text-center">
        <div className="page-container relative z-10 max-w-3xl mx-auto">
          
          <div className="inline-flex justify-center mb-6">
            <ExhibitionMark className="w-12 h-12 text-primary" />
          </div>

          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl text-foreground font-normal leading-tight mb-4">
            Start Today. Do It Again. Make A Gain.
          </h2>

          <p className="font-serif italic text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Invite your friends, set your target, and discover how powerful 90 uninterrupted days of consistency can be.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="cinnabar" size="xl" asChild>
              <Link to="/signup" className="gap-2 font-cinzel text-xs tracking-widest uppercase">
                GET STARTED FREE <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild className="font-cinzel text-xs tracking-widest uppercase">
              <Link to="/login">SIGN IN TO ACCOUNT</Link>
            </Button>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-8">
            DAILY PHOTO PROOF · STREAKS · FINANCIAL ACCOUNTABILITY
          </p>
        </div>
      </section>

      {/* Colophon Footer */}
      <footer className="py-12 border-t border-border/80 bg-background">
        <div className="page-container flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          
          <div className="flex items-center gap-3">
            <ExhibitionMark className="w-5 h-5 text-primary" />
            <span className="font-serif font-bold text-foreground tracking-wider text-base">A GAIN</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">— DAILY STREAK ACCOUNTABILITY</span>
          </div>

          <div className="flex items-center gap-6 font-cinzel text-[10px] uppercase tracking-widest">
            <Link to="/terms" className="hover:text-foreground transition-colors">TERMS</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">PRIVACY</Link>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">HOW IT WORKS</a>
          </div>

          <div className="font-mono text-[10px]">
            © {new Date().getFullYear()} A GAIN. ALL RIGHTS RESERVED.
          </div>
        </div>
      </footer>

    </div>
  )
}
