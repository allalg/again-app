import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'
import type { Profile } from '@/lib/database.types'

interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setSession, setProfile, setIsLoading, setIsInitialized, user } = useAuthStore()

  useEffect(() => {
    let mounted = true

    const hasAuthParam = typeof window !== 'undefined' && (
      window.location.search.includes('code=') ||
      window.location.hash.includes('access_token=')
    )

    // Get initial session (only finalize if not currently exchanging an OAuth code)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      if (session) {
        setSession(session)
        setUser(session.user)
        setIsLoading(false)
        setIsInitialized(true)
        fetchProfile(session.user.id)
      } else if (!hasAuthParam) {
        // Only mark initialized with null user if there is NO pending OAuth code in URL
        setSession(null)
        setUser(null)
        setIsLoading(false)
        setIsInitialized(true)
      }
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        setSession(session)
        setUser(session?.user ?? null)
        setIsLoading(false)
        setIsInitialized(true)

        if (event === 'SIGNED_IN' && session?.user) {
          fetchProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
        } else if (event === 'USER_UPDATED' && session?.user) {
          fetchProfile(session.user.id)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setProfile(data as Profile)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
    }
  }

  const { isLoading, user: storeUser } = useAuthStore()

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!storeUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
