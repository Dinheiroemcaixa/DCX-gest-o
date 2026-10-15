import type { Profile, Task, Subtask, TaskAuditLog, Pop, PopCategory, UserRole, AccountStatus } from '../types'

// Chaves para o LocalStorage
const PROFILES_KEY = 'gestor_pops_profiles'
const TASKS_KEY = 'gestor_pops_tasks'
const AUDIT_KEY = 'gestor_pops_audit'
const POPS_KEY = 'gestor_pops_pops'
const CATEGORIES_KEY = 'gestor_pops_categories'
const CURRENT_USER_KEY = 'gestor_pops_session_user'

// Inicialização com dados limpos e coerentes
export function initDefaultData() {
  if (!localStorage.getItem(PROFILES_KEY)) {
    const defaultProfiles: Profile[] = [
      {
        id: 'user-proprietario-001',
        name: 'Desenvolvedor',
        email: 'proprietario@empresa.com',
        role: 'proprietario',
        status: 'aprovado',
        avatar_color: '#2463EB',
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-gestora-002',
        name: 'Ana Paula (Gestora)',
        email: 'gestora@empresa.com',
        role: 'gestora',
        status: 'aprovado',
        avatar_color: '#7C3AED',
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-operador-003',
        name: 'Carlos Oliveira (Operador)',
        email: 'carlos@empresa.com',
        role: 'operador',
        status: 'aprovado',
        avatar_color: '#0D9488',
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-operador-004',
        name: 'Mariana Santos (Operadora)',
        email: 'mariana@empresa.com',
        role: 'operador',
        status: 'aprovado',
        avatar_color: '#EA580C',
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-pendente-005',
        name: 'Roberto Novo (Pendente)',
        email: 'roberto@empresa.com',
        role: 'operador',
        status: 'pendente',
        avatar_color: '#94A3B8',
        created_at: new Date().toISOString(),
      }
    ]
    localStorage.setItem(PROFILES_KEY, JSON.stringify(defaultProfiles))
  }

  if (!localStorage.getItem(CATEGORIES_KEY)) {
    const defaultCategories: PopCategory[] = [
      { id: 'cat-01', name: 'Fiscal & Tributário', color: '#2463EB' },
      { id: 'cat-02', name: 'Financeiro & Pagamentos', color: '#16A34A' },
      { id: 'cat-03', name: 'Departamento Pessoal', color: '#D97706' },
      { id: 'cat-04', name: 'Operações Gerais', color: '#7C3AED' }
    ]
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(defaultCategories))
  }

  if (!localStorage.getItem(POPS_KEY)) {
    const defaultPops: Pop[] = [
      {
        id: 'pop-001',
        code: 'POP-FIS-001',
        title: 'Emissão e Validação de Guias de ISS / ICMS',
        category_id: 'cat-01',
        category_name: 'Fiscal & Tributário',
        estimated_minutes: 25,
        status: 'aprovado',
        current_version: 1,
        created_by: 'user-proprietario-001',
        created_by_name: 'Desenvolvedor',
        created_at: new Date().toISOString(),
        active_version: {
          id: 'v-001',
          pop_id: 'pop-001',
          version_number: 1,
          title: 'Emissão e Validação de Guias de ISS / ICMS',
          objective: 'Padronizar a emissão correta dos tributos e evitar multas por atraso.',
          prerequisites: 'Acesso ao portal da Prefeitura e certificado digital ativo.',
          steps: [
            {
              step_number: 1,
              title: 'Acessar o portal municipal e logar com certificado',
              instructions: 'Entre na seção de Notas Fiscais Eletrônicas e selecione o período fiscal de apuração.',
              caution_note: 'Verifique se a competência selecionada é a do mês anterior fechado.'
            },
            {
              step_number: 2,
              title: 'Conferir o livro de saídas e serviços tomados',
              instructions: 'Verifique se todas as notas fiscais do período foram importadas sem erros de retenção.',
            },
            {
              step_number: 3,
              title: 'Gerar o Documento de Arrecadação (DAM/Guia)',
              instructions: 'Imprima o PDF da guia com código de barras e salve na pasta da rede interna.',
              caution_note: 'Atenção para a data de vencimento: caso caia em fim de semana, antecipe o recolhimento.'
            }
          ],
          checklist: [
            'Verificar certificado digital',
            'Conferir notas fiscais emitidas no período',
            'Validar base de cálculo do imposto',
            'Gerar a guia com código de barras legível',
            'Anexar o PDF na pasta do departamento'
          ],
          common_errors: [
            {
              error_title: 'Competência incorreta selecionada',
              how_to_avoid: 'Sempre confirme o mês e ano no topo da tela antes de clicar em calcular.'
            },
            {
              error_title: 'Emitir guia duplicada sem cancelar a anterior',
              how_to_avoid: 'Consulte o histórico de guias geradas no portal antes de emitir nova cobrança.'
            }
          ],
          created_by: 'user-proprietario-001',
          created_at: new Date().toISOString()
        }
      }
    ]
    localStorage.setItem(POPS_KEY, JSON.stringify(defaultPops))
  }

  if (!localStorage.getItem(TASKS_KEY)) {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    const defaultTasks: Task[] = [
      {
        id: 'task-001',
        title: 'Gerar apuração mensal de impostos municipais',
        description: 'Seguir o POP-FIS-001 para conferir as notas fiscais emitidas e emitir as guias.',
        assigned_to: 'user-operador-003',
        assigned_to_name: 'Carlos Oliveira (Operador)',
        assigned_to_color: '#0D9488',
        created_by: 'user-proprietario-001',
        created_by_name: 'Desenvolvedor',
        due_date: today,
        all_day: false,
        start_time: '09:00',
        end_time: '11:00',
        priority: 'Alta',
        status: 'Em Aberto',
        recurrence_type: 'monthly',
        is_meeting: false,
        sort_order: 1,
        pop_id: 'pop-001',
        pop_title: 'Emissão e Validação de Guias de ISS / ICMS',
        pop_version: 1,
        subtasks: [
          { id: 'sub-01', task_id: 'task-001', title: 'Acessar portal da prefeitura', is_completed: true, sort_order: 1 },
          { id: 'sub-02', task_id: 'task-001', title: 'Conferir livro fiscal de serviços', is_completed: false, sort_order: 2 },
          { id: 'sub-03', task_id: 'task-001', title: 'Gerar guia e anexar na pasta', is_completed: false, sort_order: 3 },
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 'task-002',
        title: 'Revisão diária de conciliação bancária',
        description: 'Conferir extratos e validar baixas de pagamentos do dia.',
        assigned_to: 'user-operador-003',
        assigned_to_name: 'Carlos Oliveira (Operador)',
        assigned_to_color: '#0D9488',
        created_by: 'user-gestora-002',
        created_by_name: 'Ana Paula (Gestora)',
        due_date: yesterday,
        all_day: true,
        priority: 'Media',
        status: 'Em Aberto',
        recurrence_type: 'weekdays',
        is_meeting: false,
        sort_order: 2,
        subtasks: [
          { id: 'sub-04', task_id: 'task-002', title: 'Baixar arquivo OFX do banco', is_completed: false, sort_order: 1 },
          { id: 'sub-05', task_id: 'task-002', title: 'Conciliar lançamentos pendentes', is_completed: false, sort_order: 2 }
        ],
        created_at: new Date().toISOString()
      },
      {
        id: 'task-003',
        title: 'Conferência de holerites para folha de pagamento',
        description: 'Verificar apontamento de horas e adiantamentos salariais.',
        assigned_to: 'user-operador-004',
        assigned_to_name: 'Mariana Santos (Operadora)',
        assigned_to_color: '#EA580C',
        created_by: 'user-gestora-002',
        created_by_name: 'Ana Paula (Gestora)',
        due_date: tomorrow,
        all_day: true,
        priority: 'Alta',
        status: 'Em Aberto',
        recurrence_type: 'monthly',
        is_meeting: false,
        sort_order: 3,
        subtasks: [],
        created_at: new Date().toISOString()
      }
    ]
    localStorage.setItem(TASKS_KEY, JSON.stringify(defaultTasks))
  }
}

// ==============================================================================
// OPERAÇÕES DE PERFIS E USUÁRIOS
// ==============================================================================

export function getProfiles(): Profile[] {
  initDefaultData()
  const data = localStorage.getItem(PROFILES_KEY)
  return data ? JSON.parse(data) : []
}

export function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
}

export function getProfileById(id: string): Profile | undefined {
  return getProfiles().find(p => p.id === id)
}

export function getCurrentSessionUser(): Profile | null {
  initDefaultData()
  const saved = localStorage.getItem(CURRENT_USER_KEY)
  if (saved) {
    const parsed = JSON.parse(saved)
    // Atualiza com dados frescos do perfil
    const fresh = getProfileById(parsed.id)
    return fresh || parsed
  }
  // Se não houver sessão ativa, inicia como o Proprietário padrão para os testes iniciais
  const defaultUser = getProfiles().find(p => p.role === 'proprietario')
  if (defaultUser) {
    setCurrentSessionUser(defaultUser)
    return defaultUser
  }
  return null
}

export function setCurrentSessionUser(user: Profile | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(CURRENT_USER_KEY)
  }
}

export function approveUserProfile(userId: string, role: UserRole, approverId: string): boolean {
  const profiles = getProfiles()
  const idx = profiles.findIndex(p => p.id === userId)
  if (idx === -1) return false

  profiles[idx] = {
    ...profiles[idx],
    status: 'aprovado',
    role,
    approved_by: approverId,
    approved_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  saveProfiles(profiles)
  return true
}

export function rejectUserProfile(userId: string): boolean {
  const profiles = getProfiles()
  const idx = profiles.findIndex(p => p.id === userId)
  if (idx === -1) return false

  profiles[idx] = {
    ...profiles[idx],
    status: 'rejeitado',
    updated_at: new Date().toISOString()
  }
  saveProfiles(profiles)
  return true
}

export function toggleUserStatus(userId: string): boolean {
  const profiles = getProfiles()
  const idx = profiles.findIndex(p => p.id === userId)
  if (idx === -1) return false

  // Impede suspender o proprietário
  if (profiles[idx].role === 'proprietario') return false

  const newStatus: AccountStatus = profiles[idx].status === 'aprovado' ? 'suspenso' : 'aprovado'
  profiles[idx] = {
    ...profiles[idx],
    status: newStatus,
    updated_at: new Date().toISOString()
  }
  saveProfiles(profiles)
  return true
}

// ==============================================================================
// OPERAÇÕES DE TAREFAS
// ==============================================================================

export function getTasks(): Task[] {
  initDefaultData()
  const data = localStorage.getItem(TASKS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function getAuditLogs(): TaskAuditLog[] {
  const data = localStorage.getItem(AUDIT_KEY)
  return data ? JSON.parse(data) : []
}

export function addAuditLog(log: Omit<TaskAuditLog, 'id' | 'created_at'>): void {
  const logs = getAuditLogs()
  const newLog: TaskAuditLog = {
    ...log,
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    created_at: new Date().toISOString()
  }
  localStorage.setItem(AUDIT_KEY, JSON.stringify([newLog, ...logs]))
}

// ==============================================================================
// OPERAÇÕES DE POPs
// ==============================================================================

export function getPops(): Pop[] {
  initDefaultData()
  const data = localStorage.getItem(POPS_KEY)
  return data ? JSON.parse(data) : []
}

export function getPopCategories(): PopCategory[] {
  initDefaultData()
  const data = localStorage.getItem(CATEGORIES_KEY)
  return data ? JSON.parse(data) : []
}
