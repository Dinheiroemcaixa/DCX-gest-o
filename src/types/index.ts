export type UserRole = 'proprietario' | 'gestora' | 'operador'

export type AccountStatus = 'pendente' | 'aprovado' | 'rejeitado' | 'suspenso'

export type Priority = 'Alta' | 'Media' | 'Baixa'

export type TaskStatus = 'Em Aberto' | 'Em Andamento' | 'Concluida'

export type RecurType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'custom'

export type PopStatus = 'rascunho' | 'em_revisao' | 'aprovado' | 'arquivado'

export interface Profile {
  id: string
  name: string
  email: string
  role: UserRole
  status: AccountStatus
  avatar_color: string
  approved_by?: string | null
  approved_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  sort_order: number
  completed_at?: string | null
  completed_by?: string | null
}

export interface Task {
  id: string
  title: string
  description?: string
  assigned_to: string // UUID do profile do responsável
  assigned_to_name?: string
  assigned_to_color?: string
  created_by: string // UUID do profile do criador
  created_by_name?: string
  due_date: string // YYYY-MM-DD
  all_day: boolean
  start_time?: string
  end_time?: string
  priority: Priority
  status: TaskStatus
  recurrence_type: RecurType
  recurrence_days?: string[] // ['seg', 'qua', 'sex']
  recurrence_group_id?: string
  is_meeting: boolean
  sort_order: number
  pop_id?: string
  pop_title?: string
  pop_version?: number
  subtasks: Subtask[]
  completed_at?: string | null
  completed_by?: string | null
  completed_by_name?: string | null
  reopened_at?: string | null
  reopened_by?: string | null
  reopened_by_name?: string | null
  created_at: string
  updated_at?: string
}

export interface TaskAuditLog {
  id: string
  task_id: string
  action: 'criacao' | 'edicao' | 'transferencia' | 'conclusao' | 'reabertura' | 'exclusao'
  actor_id: string
  actor_name: string
  previous_assigned_to?: string | null
  previous_assigned_name?: string | null
  new_assigned_to?: string | null
  new_assigned_name?: string | null
  details?: Record<string, any>
  created_at: string
}

export interface PopStep {
  step_number: number
  title: string
  instructions: string
  caution_note?: string
  image_url?: string
}

export interface PopCommonError {
  error_title: string
  how_to_avoid: string
}

export interface PopCategory {
  id: string
  name: string
  color: string
}

export interface PopVersion {
  id: string
  pop_id: string
  version_number: number
  title: string
  objective: string
  prerequisites?: string
  steps: PopStep[]
  checklist: string[]
  common_errors: PopCommonError[]
  change_summary?: string
  created_by: string
  created_at: string
}

export interface Pop {
  id: string
  code: string // Ex: 'POP-ADM-001'
  title: string
  category_id?: string
  category_name?: string
  estimated_minutes: number
  status: PopStatus
  current_version: number
  created_by: string
  created_by_name?: string
  approved_by?: string | null
  approved_at?: string | null
  created_at: string
  updated_at?: string
  active_version?: PopVersion
}

export type ViewMode = 'list' | 'kanban' | 'calendar'
export type FilterMode = 'all' | 'open' | 'in_progress' | 'late' | 'high'
export type ActivePage = 'tasks' | 'atrasadas' | 'history' | 'pops' | 'team' | 'meetings' | 'messages' | 'settings'
