'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

type AuthPermissions = {
  isScale: boolean
  canManageTeam: boolean
  canViewReports: boolean
}

type AuthContextValue = {
  user: Pick<User, 'id' | 'email'> | null
  plan: string
  subscriptionActive: boolean
  permissions: AuthPermissions
  isRefreshing: boolean
  refreshPlan: () => Promise<void>
}

type AuthProviderProps = {
  children: React.ReactNode
  initialUser: Pick<User, 'id' | 'email'>
  initialPlan: string
  initialSubscriptionActive: boolean
}

type ProfilePlan = { plano?: string | null; plan?: string | null }

const normalizePlan = (value: unknown) => {
  const clean = String(value ?? 'starter').trim().toLowerCase().replace(/^plano\s+/, '')
  return clean || 'starter'
}

const getPermissions = (plan: string): AuthPermissions => {
  const isScale = normalizePlan(plan) === 'scale'
  return { isScale, canManageTeam: isScale, canViewReports: isScale }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children, initialUser, initialPlan, initialSubscriptionActive }: AuthProviderProps) {
  const [user, setUser] = useState<Pick<User, 'id' | 'email'> | null>(initialUser)
  const [plan, setPlan] = useState(normalizePlan(initialPlan))
  const [subscriptionActive, setSubscriptionActive] = useState(initialSubscriptionActive)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const userId = user ? user.id : null

  const refreshPlan = useCallback(async () => {
    if (!userId) return
    setIsRefreshing(true)
    const supabase = createClient()
    const primary = await supabase.from('perfis_barbearia').select('plano').eq('id', userId).maybeSingle()
    let profile = primary.data as ProfilePlan | null

    if (primary.error) {
      const fallback = await supabase.from('perfis_barbearia').select('plan').eq('id', userId).maybeSingle()
      profile = fallback.data as ProfilePlan | null
    }

    const nextPlan = normalizePlan(profile?.plano ?? profile?.plan ?? 'starter')
    setPlan(nextPlan)
    setSubscriptionActive(nextPlan !== 'free' && nextPlan !== 'gratuito')
    setIsRefreshing(false)
  }, [userId])

  useEffect(() => {
    const supabase = createClient()
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setPlan('starter')
        setSubscriptionActive(false)
        return
      }

      const nextUser = { id: session.user.id, email: session.user.email }
      setUser(nextUser)
      if (session.user.id !== initialUser.id) setTimeout(() => void refreshPlan(), 0)
    })

    const interval = window.setInterval(() => void refreshPlan(), 5 * 60 * 1000)
    return () => {
      listener.subscription.unsubscribe()
      window.clearInterval(interval)
    }
  }, [initialUser.id, refreshPlan])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    plan,
    subscriptionActive,
    permissions: getPermissions(plan),
    isRefreshing,
    refreshPlan,
  }), [user, plan, subscriptionActive, isRefreshing, refreshPlan])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
