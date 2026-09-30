import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Users, Bell, Trophy,
  Settings, LogOut, Menu, X, Plus, ChevronDown, History,
  Sun, Moon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth.store'
import { useNotificationStore } from '@/store/notification.store'
import { useTheme } from '@/contexts/ThemeContext'
import { UserAvatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ExhibitionMark } from '@/components/ui/EditorialArt'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', sublabel: 'Daily Progress' },
  { to: '/friends', icon: Users, label: 'Friends', sublabel: 'Accountability' },
  { to: '/notifications', icon: Bell, label: 'Activity', sublabel: 'Alerts', badge: true },
  { to: '/history', icon: History, label: 'History', sublabel: 'Past Streaks' },
]

const mobileNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/friends', icon: Users, label: 'Friends' },
  { to: '/challenges/new', icon: Plus, label: 'New', special: true },
  { to: '/notifications', icon: Bell, label: 'Alerts', badge: true },
  { to: '/profile', icon: Trophy, label: 'Profile' },
]

export function AppLayout() {
  const { profile, signOut } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { resolvedTheme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border/80 bg-card/60 backdrop-blur-xl z-30">
        {/* Editorial Logo Lockup */}
        <div className="px-6 py-6 border-b border-border/80 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="text-primary transition-transform duration-300 group-hover:scale-105">
              <ExhibitionMark className="w-7 h-7" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-wider text-foreground block leading-none">
                A GAIN
              </span>
              <span className="font-cinzel text-[9px] uppercase tracking-[0.25em] text-muted-foreground block mt-1">
                DAILY STREAKS
              </span>
            </div>
          </Link>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            title={`Switch to ${resolvedTheme === 'dark' ? 'Parchment' : 'Nocturne'} theme`}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4 text-gilt-400" />
            ) : (
              <Moon className="h-4 w-4 text-stone-600" />
            )}
          </button>
        </div>

        {/* Create Challenge Button */}
        <div className="px-4 py-4">
          <Button variant="cinnabar" className="w-full gap-2 font-cinzel text-xs tracking-wider uppercase" size="sm" asChild>
            <Link to="/challenges/new">
              <Plus className="h-3.5 w-3.5" />
              Create Challenge
            </Link>
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="px-4 pt-2 pb-1">
          <span className="font-cinzel text-[9px] uppercase tracking-[0.25em] text-muted-foreground/70">
            NAVIGATION
          </span>
        </div>
        <nav className="flex-1 px-3 py-1 space-y-1">
          {navItems.map(({ to, icon: Icon, label, sublabel, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'nav-item group relative flex items-center justify-between px-3 py-2.5 rounded-md transition-all',
                  isActive ? 'nav-item-active' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Icon className="h-4 w-4" />
                  {badge && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cinnabar-500 text-[9px] font-mono font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{label}</span>
                  <span className="text-[10px] font-serif text-muted-foreground group-hover:text-foreground/70 leading-tight">
                    {sublabel}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/40 group-hover:text-primary transition-colors">
                →
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Profile section */}
        <div className="border-t border-border/80 px-3 py-4 bg-muted/20">
          <div
            className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/60 transition-colors group cursor-pointer"
            onClick={() => navigate('/profile')}
          >
            <UserAvatar
              src={profile?.avatar_url}
              name={profile?.display_name ?? 'User'}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-serif font-medium truncate text-foreground">{profile?.display_name}</p>
              <p className="text-[11px] font-mono text-muted-foreground truncate">@{profile?.username}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          <div className="mt-2 space-y-0.5 pt-2 border-t border-border/50">
            <button
              onClick={() => navigate('/settings')}
              className="nav-item w-full text-left text-xs py-1.5"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings & Preferences
            </button>
            <button
              onClick={handleSignOut}
              className="nav-item w-full text-left text-xs py-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Conclude Session
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border flex flex-col lg:hidden"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div className="flex items-center gap-2">
                <ExhibitionMark className="w-5 h-5 text-primary" />
                <span className="font-serif text-lg font-bold tracking-wider text-foreground">A GAIN</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-md p-1.5 hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map(({ to, icon: Icon, label, sublabel, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    cn('nav-item', isActive && 'nav-item-active')
                  }
                >
                  <div className="relative">
                    <Icon className="h-4 w-4" />
                    {badge && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cinnabar-500 text-[9px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium block leading-tight">{label}</span>
                    <span className="text-[10px] font-serif text-muted-foreground block">{sublabel}</span>
                  </div>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-border px-4 py-4 bg-muted/20">
              <div className="flex items-center gap-3 mb-3">
                <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? 'User'} size="sm" />
                <div>
                  <p className="text-sm font-serif font-medium">{profile?.display_name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">@{profile?.username}</p>
                </div>
              </div>
              <button onClick={handleSignOut} className="nav-item w-full text-left text-destructive hover:text-destructive hover:bg-destructive/10 text-xs">
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-xl border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 hover:bg-accent transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <ExhibitionMark className="w-5 h-5 text-primary" />
              <span className="font-serif font-bold tracking-wider text-base">A GAIN</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-4 w-4 text-gilt-400" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="relative">
              <Link to="/notifications">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cinnabar-500 text-[10px] font-mono font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav lg:hidden">
        {mobileNavItems.map(({ to, icon: Icon, label, special, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'bottom-nav-item',
                isActive && !special && 'bottom-nav-item-active'
              )
            }
          >
            {special ? (
              <div className="flex items-center justify-center h-11 w-11 rounded-full bg-cinnabar-500 shadow-[0_2px_12px_rgba(194,75,56,0.3)] -mt-4 border-2 border-background">
                <Icon className="h-5 w-5 text-white" />
              </div>
            ) : (
              <div className="relative">
                <Icon className="h-4 w-4" />
                {badge && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cinnabar-500 text-[9px] font-mono font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            )}
            {!special && <span className="text-[10px] font-cinzel tracking-wider uppercase">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
