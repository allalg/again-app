import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'

export function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    setIsLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setIsLoading(false)
    if (error) {
      toast({ title: 'Failed to reset password', description: error.message, variant: 'destructive' })
    } else {
      setDone(true)
      setTimeout(() => navigate('/dashboard'), 2000)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="h-16 w-16 rounded-full bg-jade-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-jade-500" />
        </div>
        <h1 className="text-2xl font-bold">Password updated!</h1>
        <p className="text-muted-foreground text-sm">Redirecting to your dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Set new password</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose a strong password for your account</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="password">New Password</label>
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            placeholder="At least 8 characters"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShow(!show)}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="confirm">Confirm Password</label>
          <Input
            id="confirm"
            type="password"
            placeholder="Repeat your password"
            leftIcon={<Lock className="h-4 w-4" />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="streak" className="w-full" loading={isLoading}>
          Reset Password
        </Button>
      </form>
    </div>
  )
}
