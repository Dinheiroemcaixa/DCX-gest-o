import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import heroImage from '../assets/login_hero.jpg'
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CheckSquare,
  ShieldCheck,
  TrendingUp,
  ArrowLeft
} from 'lucide-react'

type AuthMode = 'login' | 'signup' | 'forgot'

export const LoginView: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')

  // Campos do formulário
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados de feedback e carregamento
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const clearFeedback = () => setFeedback(null)

  // Submissão do Login Principal
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    if (!email.trim() || !password) {
      setFeedback({ type: 'error', text: 'Por favor, preencha seu e-mail e sua senha.' })
      return
    }

    setIsLoading(true)
    const result = await signIn(email, password, rememberMe)
    setIsLoading(false)

    if (!result.success) {
      setFeedback({ type: 'error', text: result.message })
    }
  }

  // Submissão de Solicitação de Acesso (Cadastro)
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    if (!name.trim() || !email.trim() || !password) {
      setFeedback({ type: 'error', text: 'Todos os campos são obrigatórios.' })
      return
    }

    if (password.length < 6) {
      setFeedback({ type: 'error', text: 'A senha deve conter no mínimo 6 caracteres.' })
      return
    }

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: 'As senhas informadas não coincidem.' })
      return
    }

    setIsLoading(true)
    const result = await signUp(name, email, password)
    setIsLoading(false)

    if (result.success) {
      setFeedback({ type: 'success', text: result.message })
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } else {
      setFeedback({ type: 'error', text: result.message })
    }
  }

  // Submissão de Recuperação de Senha
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearFeedback()

    if (!email.trim()) {
      setFeedback({ type: 'error', text: 'Informe seu e-mail corporativo cadastrado.' })
      return
    }

    setIsLoading(true)
    const result = await resetPassword(email)
    setIsLoading(false)

    if (result.success) {
      setFeedback({ type: 'success', text: result.message })
    } else {
      setFeedback({ type: 'error', text: result.message })
    }
  }

  return (
    <div className="login-layout-root" style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: 'var(--bg-app)',
      fontFamily: 'var(--font-family)',
      width: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* ======================================================================
          PAINEL ESQUERDO: INSTITUCIONAL / HERO (DESKTOP)
          ====================================================================== */}
      <div className="login-hero-panel" style={{
        flex: '1.15',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '52px 64px',
        color: '#FFFFFF',
        overflow: 'hidden'
      }}>
        {/* Imagem de Fundo de Alta Definição */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
          transform: 'scale(1.02)'
        }} />

        {/* Overlay em Degradê Sofisticado (Azul Corporativo e Tons Noturnos) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(140deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 58, 138, 0.88) 55%, rgba(15, 23, 42, 0.97) 100%)',
          zIndex: 1
        }} />

        {/* Topo Institucional: Marca DCX Gestão */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '18px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px -2px rgba(37, 99, 235, 0.45)'
          }}>
            DCX
          </div>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: '18px',
              letterSpacing: '-0.3px',
              color: '#FFFFFF',
              lineHeight: 1.2
            }}>
              DCX GESTÃO
            </div>
            <div style={{
              fontSize: '12px',
              color: '#94A3B8',
              letterSpacing: '0.3px'
            }}>
              Sistema de Governança & POPs
            </div>
          </div>
        </div>

        {/* Centro Institucional: Proposta de Valor e Cards Flutuantes */}
        <div style={{ position: 'relative', zIndex: 2, margin: '48px 0', maxWidth: '540px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            backdropFilter: 'blur(8px)',
            fontSize: '12px',
            fontWeight: 600,
            color: '#93C5FD',
            marginBottom: '20px'
          }}>
            <ShieldCheck size={14} />
            <span>Ambiente Corporativo Seguro & Homologado</span>
          </div>

          <h2 style={{
            fontSize: '38px',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.18,
            letterSpacing: '-0.9px',
            margin: '0 0 16px 0'
          }}>
            Gestão inteligente.<br />Operação sob controle.
          </h2>

          <p style={{
            fontSize: '15px',
            color: '#CBD5E1',
            lineHeight: 1.6,
            margin: '0 0 36px 0'
          }}>
            A plataforma empresarial definitiva para padronização de procedimentos, controle diário de demandas e cobertura transparente de rotinas para equipes de alto desempenho.
          </p>

          {/* Cards de Destaque Operacional */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.25)',
                color: '#60A5FA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckSquare size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#FFFFFF' }}>
                  Procedimentos Operacionais Padronizados
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  Biblioteca com versionamento contínuo e checklists passo a passo.
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(15, 23, 42, 0.55)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34D399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#FFFFFF' }}>
                  Previsibilidade e Trilha de Auditoria
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  Retenção permanente de histórico para conformidade e segurança total.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Institucional */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          fontSize: '12px',
          color: '#64748B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '20px'
        }}>
          <span>© {new Date().getFullYear()} DCX Gestão • Todos os direitos reservados.</span>
          <span>Versão 2.1.0</span>
        </div>
      </div>

      {/* ======================================================================
          PAINEL DIREITO: FORMULÁRIO DE AUTENTICAÇÃO (SPLIT-SCREEN)
          ====================================================================== */}
      <div className="login-form-panel" style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
        backgroundColor: 'var(--surface)',
        overflowY: 'auto'
      }}>
        <div style={{
          maxWidth: '420px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>

          {/* Cabeçalho do Formulário */}
          <div style={{ marginBottom: '32px' }}>
            {/* Header Mobile com Identidade DCX */}
            <div className="login-mobile-brand" style={{
              display: 'none',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                DCX
              </div>
              <div style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text-main)' }}>
                DCX GESTÃO
              </div>
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-main)',
              letterSpacing: '-0.4px',
              margin: '0 0 8px 0'
            }}>
              {mode === 'login' && 'Bem-vindo ao DCX Gestão'}
              {mode === 'signup' && 'Solicitar Acesso'}
              {mode === 'forgot' && 'Recuperar Senha'}
            </h1>

            <p style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              margin: 0,
              lineHeight: 1.5
            }}>
              {mode === 'login' && 'Entre para acessar sua área de trabalho corporativa.'}
              {mode === 'signup' && 'Preencha seus dados cadastrais para solicitar autorização no sistema.'}
              {mode === 'forgot' && 'Informe o seu e-mail cadastrado para receber o link seguro de redefinição.'}
            </p>
          </div>

          {/* Mensagens de Feedback Elegantes (Exibidas Somente em Falha ou Sucesso) */}
          {feedback && (
            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              lineHeight: 1.45,
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              backgroundColor: feedback.type === 'error' ? 'var(--danger-soft)' : 'var(--success-soft)',
              color: feedback.type === 'error' ? 'var(--danger)' : 'var(--success)',
              border: `1px solid ${feedback.type === 'error' ? 'var(--danger-border)' : 'var(--success-border)'}`,
              animation: 'fadeIn 0.2s ease-out'
            }}>
              {feedback.type === 'error' ? (
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <span style={{ flex: 1 }}>{feedback.text}</span>
            </div>
          )}

          {/* ====================================================================
              MODO 1: LOGIN PRINCIPAL (ENTRAR)
              ==================================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Campo E-mail */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  E-mail Corporativo
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      paddingLeft: '40px',
                      height: '44px',
                      fontSize: '14px',
                      borderRadius: 'var(--radius-md)',
                      borderColor: 'var(--border)'
                    }}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Senha de Acesso
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      paddingLeft: '40px',
                      paddingRight: '42px',
                      height: '44px',
                      fontSize: '14px',
                      borderRadius: 'var(--radius-md)',
                      borderColor: 'var(--border)'
                    }}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Opções: Manter Conectado e Esqueci Minha Senha */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '13px',
                marginTop: '2px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: '15px', height: '15px' }}
                  />
                  <span>Manter conectado</span>
                </label>

                <button
                  type="button"
                  onClick={() => { setMode('forgot'); clearFeedback(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>

              {/* Botão de Ação Principal Entrar */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '46px',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>

              {/* Link Secundário: Solicitar Cadastro */}
              <div style={{
                textAlign: 'center',
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                marginTop: '16px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border)'
              }}>
                <span>Novo colaborador? </span>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); clearFeedback(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Solicitar acesso
                </button>
              </div>
            </form>
          )}

          {/* ====================================================================
              MODO 2: SOLICITAÇÃO DE ACESSO (CADASTRO)
              ==================================================================== */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {/* Campo Nome */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Nome Completo *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: '40px', height: '42px', fontSize: '13.5px' }}
                    required
                  />
                </div>
              </div>

              {/* Campo E-mail */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  E-mail Corporativo *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '40px', height: '42px', fontSize: '13.5px' }}
                    required
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Criar Senha (mínimo 6 caracteres) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Lock size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '40px', paddingRight: '42px', height: '42px', fontSize: '13.5px' }}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Campo Confirmar Senha */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  Confirmar Senha *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <KeyRound size={16} />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{ paddingLeft: '40px', paddingRight: '42px', height: '42px', fontSize: '13.5px' }}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Nota de Governança e Aprovação */}
              <div style={{
                backgroundColor: 'var(--surface-alt)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '11px 14px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.45
              }}>
                🔒 <strong>Aprovação Obrigatória:</strong> Seu cadastro entrará como <strong>operador pendente</strong> e será ativado pelo Proprietário do Sistema antes da liberação de tarefas.
              </div>

              {/* Botão Enviar Solicitação */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 700,
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span>Enviando solicitação...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={17} />
                    <span>Enviar Solicitação de Acesso</span>
                  </>
                )}
              </button>

              {/* Voltar ao Login */}
              <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => { setMode('login'); clearFeedback(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Voltar para o login</span>
                </button>
              </div>
            </form>
          )}

          {/* ====================================================================
              MODO 3: RECUPERAÇÃO DE SENHA (ESQUECI MINHA SENHA)
              ==================================================================== */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                  E-mail Cadastrado
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '40px', height: '44px', fontSize: '14px' }}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isLoading}
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    <span>Enviando link...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={17} />
                    <span>Enviar Link de Recuperação</span>
                  </>
                )}
              </button>

              <div style={{
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: '10px',
                paddingTop: '18px',
                borderTop: '1px solid var(--border)'
              }}>
                <button
                  type="button"
                  onClick={() => { setMode('login'); clearFeedback(); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Lembrou sua senha? Voltar ao login</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Regras CSS Responsivas Embutidas */}
      <style>{`
        @media (max-width: 960px) {
          .login-hero-panel {
            display: none !important;
          }
          .login-mobile-brand {
            display: flex !important;
          }
          .login-form-panel {
            padding: 32px 20px !important;
          }
        }
      `}</style>
    </div>
  )
}
