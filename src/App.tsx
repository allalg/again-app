import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { Toaster } from '@/components/ui/Toaster'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

// Pages — Auth
import { LandingPage } from '@/pages/Landing'
import { LoginPage } from '@/pages/auth/Login'
import { SignupPage } from '@/pages/auth/Signup'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPassword'
import { ResetPasswordPage } from '@/pages/auth/ResetPassword'
import { EmailVerificationPage } from '@/pages/auth/EmailVerification'

// Pages — App
import { DashboardPage } from '@/pages/Dashboard'
import { FriendsPage } from '@/pages/Friends'
import { NotificationsPage } from '@/pages/Notifications'
import { ProfilePage } from '@/pages/Profile'
import { SettingsPage } from '@/pages/Settings'
import { HistoryPage } from '@/pages/History'

// Pages — Challenges
import { CreateChallengePage } from '@/pages/challenges/CreateChallenge'
import { ChallengeDetailPage } from '@/pages/challenges/ChallengeDetail'
import { SubmitProofPage } from '@/pages/challenges/SubmitProof'
import { ChallengeChatPage } from '@/pages/challenges/ChallengeChat'
import { ChallengeCalendarPage } from '@/pages/challenges/ChallengeCalendar'
import { LeaderboardPage } from '@/pages/challenges/Leaderboard'
import { PenaltyLedgerPage } from '@/pages/challenges/PenaltyLedger'
import { ChallengeInvitePage } from '@/pages/challenges/ChallengeInvite'
import { InviteAcceptPage } from '@/pages/challenges/InviteAccept'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,       // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/invite/:token" element={<InviteAcceptPage />} />

                {/* Auth routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/verify-email" element={<EmailVerificationPage />} />
                </Route>

                {/* Protected app routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/friends" element={<FriendsPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/history" element={<HistoryPage />} />

                    {/* Challenge routes */}
                    <Route path="/challenges/new" element={<CreateChallengePage />} />
                    <Route path="/challenges/create" element={<Navigate to="/challenges/new" replace />} />
                    <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
                    <Route path="/challenges/:id/invite" element={<ChallengeInvitePage />} />
                    <Route path="/challenges/:id/submit" element={<SubmitProofPage />} />
                    <Route path="/challenges/:id/chat" element={<ChallengeChatPage />} />
                    <Route path="/challenges/:id/calendar" element={<ChallengeCalendarPage />} />
                    <Route path="/challenges/:id/leaderboard" element={<LeaderboardPage />} />
                    <Route path="/challenges/:id/ledger" element={<PenaltyLedgerPage />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              <Toaster />
            </NotificationProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
