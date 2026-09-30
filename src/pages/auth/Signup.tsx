import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, User, AtSign, Chrome } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toaster'
import { USERNAME_REGEX } from '@/lib/utils'

const signupSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50),
  username: z
    .string()
    .regex(USERNAME_REGEX, 'Username: 3-30 chars, letters/numbers/underscores only'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

export function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupForm) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username.toLowerCase(),
          full_name: data.displayName,
          display_name: data.displayName,
        },
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    })

    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' })
    } else {
      toast({
        title: 'Almost there! 🎉',
        description: 'Check your email to verify your account.',
        variant: 'success' as any,
      })
      navigate('/verify-email')
    }
  }

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) {
      toast({ title: 'Google signup failed', description: error.message, variant: 'destructive' })
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold">Create your account</h1>
        <p className="text-muted-foreground text-sm mt-1">Join A GAIN — build your daily streak</p>
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={handleGoogleSignup} loading={isGoogleLoading} id="google-signup-btn">
        <Chrome className="h-4 w-4" />
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="displayName">Display Name</label>
          <Input
            id="displayName"
            placeholder="Your full name"
            leftIcon={<User className="h-4 w-4" />}
            error={errors.displayName?.message}
            {...register('displayName')}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="username">Username</label>
          <Input
            id="username"
            placeholder="your_username"
            leftIcon={<AtSign className="h-4 w-4" />}
            error={errors.username?.message}
            {...register('username')}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="email">Email</label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            leftIcon={<Mail className="h-4 w-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="password">Password</label>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="At least 8 chars, uppercase, number"
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm Password</label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your password"
            leftIcon={<Lock className="h-4 w-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <Button type="submit" variant="streak" className="w-full" loading={isSubmitting} id="signup-submit-btn">
          Create Account
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By signing up you agree to our{' '}
        <a href="#" className="underline hover:text-foreground">Terms</a> and{' '}
        <a href="#" className="underline hover:text-foreground">Privacy Policy</a>.
      </p>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
