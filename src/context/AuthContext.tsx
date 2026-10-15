import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Profile, UserRole } from '../types'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import {
  getCurrentSessionUser,
  setCurrentSessionUser,
  getProfiles,
  approveUserProfile,
  rejectUserProfile,
  toggleUserStatus
} from '../lib/storage'

interface AuthContextType {
  currentUser: Profile | null
  profiles: Profile[]
  isProprietario: boolean
  isGestora: boolean
  isOperador: boolean
  isApproved: boolean
  isPending: boolean
  isSuspended: boolean
  isLoadingSession: boolean
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; message: string }>
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>
  logout: () => Promise<void>
  approveUser: (userId: string, role: UserRole) => boolean
  rejectUser: (userId: string) => boolean
  toggleStatus: (userId: string) => boolean
  refreshProfiles: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => getCurrentSessionUser())
  const [profiles, setProfiles] = useState<Profile[]>(() => getProfiles())
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true)

  const refreshProfiles = () => {
    const list = getProfiles()
    setProfiles(list)
    if (currentUser) {
      const updated = list.find(p => p.id === currentUser.id)
      if (updated) setCurrentUser(updated)
    }
  }

  // Carrega ou sincroniza o perfil do usuário a partir do Supabase
  const loadProfileForUser = async (userId: string, email: string, metaName?: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data && !error) {
        const displayName = (data.role === 'proprietario' && (!data.name || data.name === 'Proprietário' || data.name === 'Proprietário do Sistema'))
          ? 'Desenvolvedor'
          : data.name

        const profile: Profile = {
          id: data.id,
          name: displayName,
          email: data.email,
          role: data.role,
          status: data.status,
          avatar_color: data.avatar_color || '#2463EB',
          approved_by: data.approved_by,
          approved_at: data.approved_at,
          created_at: data.created_at,
          updated_at: data.updated_at
        }
        setCurrentUser(profile)
        setCurrentSessionUser(profile)
        return
      }
    } catch (e) {
      console.warn('Consulta ao perfil no Supabase:', e)
    }

    // Perfil temporário enquanto o registro no banco é processado pela trigger
    const fallbackProfile: Profile = {
      id: userId,
      name: metaName || email.split('@')[0] || 'Usuário',
      email: email,
      role: 'operador',
      status: 'pendente',
      avatar_color: '#2463EB'
    }
    setCurrentUser(fallbackProfile)
    setCurrentSessionUser(fallbackProfile)
  }

  // Inicialização e restauração segura da sessão
  useEffect(() => {
    let isMounted = true

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user && isMounted) {
            await loadProfileForUser(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.name
            )
          } else if (isMounted) {
            setCurrentUser(null)
            setCurrentSessionUser(null)
          }
        } catch (err) {
          console.error('Erro ao recuperar sessão Supabase:', err)
        } finally {
          if (isMounted) setIsLoadingSession(false)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!isMounted) return
          if (event === 'SIGNED_OUT' || !session) {
            setCurrentUser(null)
            setCurrentSessionUser(null)
          } else if (session?.user) {
            await loadProfileForUser(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.name
            )
          }
        })

        return () => {
          isMounted = false
          subscription.unsubscribe()
        }
      } else {
        const stored = getCurrentSessionUser()
        if (stored && isMounted) {
          setCurrentUser(stored)
        }
        if (isMounted) setIsLoadingSession(false)
      }
    }

    initAuth()
  }, [])

  const isProprietario = currentUser?.role === 'proprietario' && currentUser?.status === 'aprovado'
  const isGestora = currentUser?.role === 'gestora' && currentUser?.status === 'aprovado'
  const isOperador = currentUser?.role === 'operador' && currentUser?.status === 'aprovado'
  const isApproved = currentUser?.status === 'aprovado'
  const isPending = currentUser?.status === 'pendente'
  const isSuspended = currentUser?.status === 'suspenso'

  // Autenticação Real com Supabase (e-mail e senha)
  const signIn = async (
    email: string,
    password: string,
    _rememberMe = true
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !password) {
      return { success: false, message: 'Informe seu e-mail e sua senha.' }
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Serviço de autenticação indisponível. As variáveis de conexão do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas neste ambiente.'
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('invalid login credentials')) {
          return { success: false, message: 'E-mail ou senha incorretos.' }
        }
        if (msg.includes('email not confirmed')) {
          return { success: false, message: 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.' }
        }
        return { success: false, message: error.message || 'Falha ao autenticar. Tente novamente.' }
      }

      if (!data.user) {
        return { success: false, message: 'Nenhum usuário retornado pelo servidor.' }
      }

      await loadProfileForUser(data.user.id, data.user.email || trimmedEmail, data.user.user_metadata?.name)
      return { success: true, message: 'Autenticado com sucesso!' }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro inesperado durante o login.' }
    }
  }

  // Solicitação de Acesso / Cadastro Real no Supabase
  const signUp = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!trimmedName || !trimmedEmail || !password) {
      return { success: false, message: 'Todos os campos são obrigatórios.' }
    }
    if (password.length < 6) {
      return { success: false, message: 'A senha deve conter no mínimo 6 caracteres.' }
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Serviço de autenticação indisponível. As variáveis de conexão do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas neste ambiente.'
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName
          }
        }
      })

      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('already registered')) {
          return { success: false, message: 'Este e-mail já possui uma solicitação ou conta cadastrada.' }
        }
        return { success: false, message: error.message || 'Falha ao solicitar acesso.' }
      }

      // Se a confirmação de e-mail estiver ativada no Supabase
      if (data.user && !data.session) {
        return {
          success: true,
          message: 'Solicitação registrada com sucesso! Um e-mail de confirmação foi enviado. Confirme seu endereço e aguarde a aprovação do Proprietário.'
        }
      }

      if (data.user) {
        await loadProfileForUser(data.user.id, trimmedEmail, trimmedName)
      }

      return {
        success: true,
        message: 'Solicitação de acesso enviada com sucesso! Aguarde a aprovação do Proprietário do Sistema.'
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro inesperado ao solicitar acesso.' }
    }
  }

  // Recuperação de Senha Oficial no Supabase
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) {
      return { success: false, message: 'Informe o e-mail cadastrado.' }
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        success: false,
        message: 'Serviço de autenticação indisponível. As variáveis de conexão do Supabase (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY) não estão configuradas neste ambiente.'
      }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/`
      })

      if (error) {
        return { success: false, message: 'Não foi possível solicitar a recuperação. Verifique o e-mail informado.' }
      }

      return {
        success: true,
        message: 'Se o e-mail estiver cadastrado, as instruções para redefinição foram enviadas para a sua caixa de entrada.'
      }
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erro ao solicitar redefinição de senha.' }
    }
  }

  // Encerramento Seguro da Sessão
  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (e) {
        console.warn('Erro ao deslogar no Supabase:', e)
      }
    }
    setCurrentSessionUser(null)
    setCurrentUser(null)
  }

  const approveUser = (userId: string, role: UserRole): boolean => {
    if (!isProprietario || !currentUser) return false
    const ok = approveUserProfile(userId, role, currentUser.id)
    if (ok) refreshProfiles()
    return ok
  }

  const rejectUser = (userId: string): boolean => {
    if (!isProprietario) return false
    const ok = rejectUserProfile(userId)
    if (ok) refreshProfiles()
    return ok
  }

  const toggleStatus = (userId: string): boolean => {
    if (!isProprietario) return false
    const ok = toggleUserStatus(userId)
    if (ok) refreshProfiles()
    return ok
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profiles,
        isProprietario,
        isGestora,
        isOperador,
        isApproved,
        isPending,
        isSuspended,
        isLoadingSession,
        signIn,
        signUp,
        resetPassword,
        logout,
        approveUser,
        rejectUser,
        toggleStatus,
        refreshProfiles
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider')
  }
  return context
}
