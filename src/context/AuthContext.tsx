import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Profile, UserRole, AccountStatus } from '../types'
import {
  getCurrentSessionUser,
  setCurrentSessionUser,
  getProfiles,
  saveProfiles,
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
  loginAs: (profile: Profile) => void
  requestSignUp: (name: string, email: string) => { success: boolean; message: string }
  logout: () => void
  approveUser: (userId: string, role: UserRole) => boolean
  rejectUser: (userId: string) => boolean
  toggleStatus: (userId: string) => boolean
  refreshProfiles: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => getCurrentSessionUser())
  const [profiles, setProfiles] = useState<Profile[]>(() => getProfiles())

  const refreshProfiles = () => {
    const list = getProfiles()
    setProfiles(list)
    if (currentUser) {
      const updated = list.find(p => p.id === currentUser.id)
      if (updated) setCurrentUser(updated)
    }
  }

  useEffect(() => {
    refreshProfiles()
  }, [])

  const isProprietario = currentUser?.role === 'proprietario' && currentUser?.status === 'aprovado'
  const isGestora = currentUser?.role === 'gestora' && currentUser?.status === 'aprovado'
  const isOperador = currentUser?.role === 'operador' && currentUser?.status === 'aprovado'
  const isApproved = currentUser?.status === 'aprovado'
  const isPending = currentUser?.status === 'pendente'
  const isSuspended = currentUser?.status === 'suspenso'

  const loginAs = (profile: Profile) => {
    setCurrentSessionUser(profile)
    setCurrentUser(profile)
  }

  const logout = () => {
    setCurrentSessionUser(null)
    setCurrentUser(null)
  }

  const requestSignUp = (name: string, email: string): { success: boolean; message: string } => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    if (!trimmedName || !trimmedEmail) {
      return { success: false, message: 'Preencha seu nome e e-mail.' }
    }

    const currentList = getProfiles()
    if (currentList.some(p => p.email.toLowerCase() === trimmedEmail)) {
      return { success: false, message: 'Este e-mail já possui uma solicitação ou conta cadastrada.' }
    }

    const newProfile: Profile = {
      id: 'user_' + Date.now(),
      name: trimmedName,
      email: trimmedEmail,
      role: 'operador', // Perfil padrão temporário até a decisão do proprietário
      status: 'pendente', // Conta obrigatoriamente pendente de aprovação
      avatar_color: '#94A3B8',
      created_at: new Date().toISOString()
    }

    const updated = [...currentList, newProfile]
    saveProfiles(updated)
    setProfiles(updated)
    loginAs(newProfile) // Loga na conta pendente para ver a tela de aviso de aprovação

    return {
      success: true,
      message: 'Cadastro enviado com sucesso! Aguarde a aprovação do Proprietário para acessar o sistema.'
    }
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
        loginAs,
        requestSignUp,
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
