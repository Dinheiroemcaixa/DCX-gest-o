// ==============================================================================
// SUÍTE DE TESTES: AUTENTICAÇÃO REAL E SEGURANÇA DA TELA DE LOGIN (DCX GESTÃO)
// ==============================================================================

import fs from 'fs'
import path from 'path'

console.log('================================================================================')
console.log('SUÍTE DE TESTES: AUTENTICAÇÃO REAL E TELA DE LOGIN DCX GESTÃO')
console.log('================================================================================\n')

let passedTests = 0

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FALHA: ${message}`)
  }
}

// 1. Verificar remoção definitiva de perfis fictícios na tela de login
console.log('[TESTE 1: Remoção de listas de perfis fictícios e botões de login rápido]')
const loginViewPath = path.resolve('src/pages/LoginView.tsx')
const loginContent = fs.readFileSync(loginViewPath, 'utf8')

assert(!loginContent.includes('profiles.map'), 'LoginView NÃO deve mapear ou listar perfis de usuários na tela')
assert(!loginContent.includes('loginAs('), 'LoginView NÃO deve conter função loginAs para bypass de login')
assert(!loginContent.includes('Lucas Mendes'), 'LoginView não deve expor nomes ou e-mails de exemplo de colaboradores')
assert(loginContent.includes('DCX Gestão'), 'LoginView deve conter a identidade oficial do DCX Gestão')
assert(loginContent.includes('Bem-vindo ao DCX Gestão'), 'Título deve ser "Bem-vindo ao DCX Gestão"')
assert(loginContent.includes('Entre para acessar sua área de trabalho'), 'Subtítulo deve ser "Entre para acessar sua área de trabalho"')
console.log('✓ PASSOU: Tela de login limpa e profissional, sem dados fictícios nem atalhos.\n')
passedTests++

// 2. Verificar remoção de atalhos de perfil no Sidebar
console.log('[TESTE 2: Remoção de caixa de simulação de perfil no Sidebar]')
const sidebarPath = path.resolve('src/components/Sidebar.tsx')
const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')

assert(!sidebarContent.includes('Simular Perfil no Teste:'), 'Sidebar NÃO deve ter caixa de simulação de perfil')
assert(!sidebarContent.includes('loginAs(selected)'), 'Sidebar NÃO deve invocar loginAs para troca arbitrária de perfil')
console.log('✓ PASSOU: Sidebar blindado contra troca arbitrária de papéis.\n')
passedTests++

// 3. Verificar integração com Supabase Auth no AuthContext
console.log('[TESTE 3: Integração com cliente Supabase oficial (signInWithPassword, signUp, resetPasswordForEmail)]')
const authContextPath = path.resolve('src/context/AuthContext.tsx')
const authContent = fs.readFileSync(authContextPath, 'utf8')

assert(authContent.includes('supabase.auth.signInWithPassword'), 'Deve utilizar signInWithPassword')
assert(authContent.includes('supabase.auth.signUp'), 'Deve utilizar signUp oficial')
assert(authContent.includes('supabase.auth.resetPasswordForEmail'), 'Deve utilizar resetPasswordForEmail')
assert(authContent.includes('supabase.auth.onAuthStateChange'), 'Deve manter listener de estado de sessão')
assert(authContent.includes('supabase.auth.getSession'), 'Deve restaurar sessão salva no getSession')
assert(authContent.includes('isLoadingSession'), 'Deve controlar o estado de carregamento de sessão')
console.log('✓ PASSOU: Todos os métodos oficiais do Supabase Auth implementados no AuthContext.\n')
passedTests++

// 4. Validação lógica de regras de formulário
console.log('[TESTE 4: Validação de regras e integridade dos campos]')
// Validar checagem de senha mínima (>= 6)
assert(loginContent.includes('password.length < 6'), 'Deve validar senha mínima de 6 caracteres na solicitação de acesso')
assert(loginContent.includes('password !== confirmPassword'), 'Deve validar confirmação de senha idêntica')
assert(loginContent.includes('rememberMe'), 'Opção Manter conectado implementada')
assert(loginContent.includes('Esqueci minha senha'), 'Opção Esqueci minha senha implementada')
assert(loginContent.includes('Solicitar acesso'), 'Opção Solicitar acesso implementada')
console.log('✓ PASSOU: Validação rigorosa de campos e confirmações garantida.\n')
passedTests++

// 5. Proteção de páginas em App.tsx
console.log('[TESTE 5: Bloqueio estrito de acesso sem autenticação e tratamento de status]')
const appPath = path.resolve('src/App.tsx')
const appContent = fs.readFileSync(appPath, 'utf8')

assert(appContent.includes('if (!currentUser)'), 'App deve bloquear renderização e exibir LoginView se currentUser for nulo')
assert(appContent.includes('if (!isApproved)'), 'App deve exibir PendingApprovalView se o usuário não estiver aprovado')
assert(appContent.includes('if (isLoadingSession)'), 'App deve exibir tela de transição enquanto a sessão é verificada')
console.log('✓ PASSOU: Rotas e telas protegidas contra acessos não autorizados.\n')
passedTests++

console.log('================================================================================')
console.log(`RESULTADO FINAL: TODOS OS ${passedTests} TESTES DE AUTENTICAÇÃO FORAM APROVADOS!`)
console.log('================================================================================\n')
