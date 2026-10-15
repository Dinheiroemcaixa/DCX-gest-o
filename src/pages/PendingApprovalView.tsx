import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Clock, AlertTriangle, ShieldX, LogOut, CheckCircle2 } from 'lucide-react'

export const PendingApprovalView: React.FC = () => {
  const { currentUser, logout, isSuspended } = useAuth()

  const isRejected = currentUser?.status === 'rejeitado'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-app)',
      padding: '24px'
    }}>
      <div className="card" style={{
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Ícone de Estado */}
        {isSuspended ? (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--danger-soft)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldX size={36} />
          </div>
        ) : isRejected ? (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--danger-soft)',
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={36} />
          </div>
        ) : (
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--warning-soft)',
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={36} />
          </div>
        )}

        {/* Título e Mensagem */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
          {isSuspended
            ? 'Acesso Suspenso'
            : isRejected
            ? 'Cadastro Não Aprovado'
            : 'Aguardando Aprovação do Proprietário'}
        </h2>

        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {isSuspended ? (
            <>
              Sua conta (<strong>{currentUser?.email}</strong>) foi temporariamente suspensa pelo Proprietário.
              Para regularizar o acesso às suas tarefas e rotinas, consulte o responsável pelo sistema.
            </>
          ) : isRejected ? (
            <>
              Sua solicitação de cadastro para o e-mail <strong>{currentUser?.email}</strong> não foi aprovada
              pelo Proprietário do Sistema.
            </>
          ) : (
            <>
              Olá, <strong>{currentUser?.name}</strong>! Seu cadastro foi recebido com sucesso.
              Por razões de segurança e sigilo operacional, sua conta precisa ser autorizada pelo
              <strong> Proprietário do Sistema</strong> antes de você visualizar as tarefas e POPs.
            </>
          )}
        </p>

        {/* Badge Informativo */}
        <div style={{
          backgroundColor: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          fontSize: '12.5px',
          color: 'var(--text-secondary)',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span>Situação atual da conta:</span>
          <span className={`badge ${isSuspended || isRejected ? 'badge-danger' : 'badge-warning'}`}>
            {currentUser?.status?.toUpperCase()}
          </span>
        </div>

        {/* Botão de Sair / Trocar de Conta */}
        <button
          className="btn btn-secondary"
          onClick={logout}
          style={{ marginTop: '8px', width: '100%' }}
        >
          <LogOut size={16} />
          Voltar para o Login / Trocar de Conta
        </button>
      </div>
    </div>
  )
}
