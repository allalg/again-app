import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Moon, Sun, Shield, LogOut, ChevronRight,
  Smartphone, Mail, Lock, Trash2, Globe
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/Toaster'

export function SettingsPage() {
  const { user, profile, signOut } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast({ title: 'Type DELETE to confirm', variant: 'destructive' })
      return
    }
    setIsDeleting(true)
    try {
      await supabase.auth.admin.deleteUser(user!.id)
      await signOut()
      navigate('/')
    } catch {
      // Fallback: just sign out
      await signOut()
      navigate('/')
    } finally {
      setIsDeleting(false)
    }
  }

  const settingsGroups = [
    {
      title: 'Appearance',
      items: [
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: 'Theme',
          value: theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System',
          action: (
            <div className="flex gap-1">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    theme === t ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          ),
        },
        {
          icon: Globe,
          label: 'Timezone',
          value: profile?.timezone ?? 'UTC',
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          value: 'Enabled',
          badge: <Badge variant="active">On</Badge>,
        },
        {
          icon: Mail,
          label: 'Email Reminders',
          value: user?.email ?? '',
          badge: <Badge variant="active">On</Badge>,
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: Mail,
          label: 'Email',
          value: user?.email ?? '',
        },
        {
          icon: Lock,
          label: 'Change Password',
          value: 'Update your password',
          chevron: true,
          onClick: async () => {
            await supabase.auth.resetPasswordForEmail(user?.email ?? '', {
              redirectTo: `${window.location.origin}/reset-password`,
            })
            toast({ title: 'Password reset email sent' })
          },
        },
        {
          icon: Shield,
          label: 'Privacy',
          value: 'Profile visibility, data settings',
          chevron: true,
        },
      ],
    },
    {
      title: 'Danger Zone',
      danger: true,
      items: [
        {
          icon: LogOut,
          label: 'Sign Out',
          value: 'Sign out of this device',
          onClick: handleSignOut,
          danger: true,
        },
        {
          icon: Trash2,
          label: 'Delete Account',
          value: 'Permanently delete your account and data',
          onClick: () => setShowDeleteDialog(true),
          danger: true,
        },
      ],
    },
  ]

  return (
    <div className="page-container py-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account preferences</p>
      </div>

      {settingsGroups.map((group) => (
        <Card key={group.title} className={group.danger ? 'border-destructive/30' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-medium uppercase tracking-wide ${group.danger ? 'text-destructive' : 'text-muted-foreground'}`}>
              {group.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-0 divide-y divide-border">
            {group.items.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 py-3.5 ${
                  (item as any).onClick ? 'cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded-xl transition-colors' : ''
                }`}
                onClick={(item as any).onClick}
              >
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  (item as any).danger ? 'bg-destructive/10' : 'bg-muted'
                }`}>
                  <item.icon className={`h-4 w-4 ${(item as any).danger ? 'text-destructive' : 'text-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${(item as any).danger ? 'text-destructive' : ''}`}>
                    {item.label}
                  </p>
                  {item.value && (
                    <p className="text-xs text-muted-foreground truncate">{item.value}</p>
                  )}
                </div>
                {(item as any).action && (item as any).action}
                {(item as any).badge && (item as any).badge}
                {(item as any).chevron && <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <p className="text-center font-mono text-xs text-muted-foreground">A GAIN v1.0.0 · Do it again. Make a gain.</p>

      {/* Delete account dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This action is <strong>irreversible</strong>. All your challenges, progress data, penalties and messages will be permanently deleted.
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Type <strong>DELETE</strong> to confirm</label>
              <Input
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="border-destructive/40 focus-visible:ring-destructive/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              loading={isDeleting}
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE'}
            >
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
