import { Link } from 'react-router-dom'
import { MailOpen } from 'lucide-react'

export function EmailVerificationPage() {
  return (
    <div className="text-center space-y-6">
      <div className="h-20 w-20 rounded-2xl bg-streak-500/10 border border-streak-500/20 flex items-center justify-center mx-auto">
        <MailOpen className="h-10 w-10 text-streak-500" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          We've sent a verification link to your email address. 
          Click the link in the email to activate your account and start your first challenge.
        </p>
      </div>
      <div className="rounded-xl bg-muted/50 border border-border p-4 text-sm text-muted-foreground">
        <p>Didn't receive the email? Check your spam folder, or{' '}
          <button className="text-primary hover:underline font-medium">resend the verification email</button>.
        </p>
      </div>
      <Link to="/login" className="text-sm text-primary hover:underline font-medium">
        Back to login
      </Link>
    </div>
  )
}
