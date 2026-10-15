import React, { useState, useEffect } from 'react'
import type { Task, ActivePage, Pop } from './types'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getTasks, saveTasks, addAuditLog } from './lib/storage'
import { getTodayDateStr } from './lib/dateUtils'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { ToastContainer, type ToastMessage } from './components/Toast'
import { TaskModal } from './components/TaskModal'
import { TransferModal } from './components/TransferModal'
import { PopDrawer } from './components/PopDrawer'
import { LoginView } from './pages/LoginView'
import { PendingApprovalView } from './pages/PendingApprovalView'
import { TasksPage } from './pages/TasksPage'
import { AtrasadasPage } from './pages/AtrasadasPage'
import { HistoryPage } from './pages/HistoryPage'
import { PopsPage } from './pages/PopsPage'
import { TeamPage } from './pages/TeamPage'
import { SettingsPage } from './pages/SettingsPage'
import './styles/theme.css'

function MainApp() {
  const { currentUser, isApproved, isProprietario, isOperador, isLoadingSession } = useAuth()

  const [activePage, setActivePage] = useState<ActivePage>('tasks')
  const [tasks, setTasks] = useState<Task[]>(() => getTasks())
  const [searchQuery, setSearchQuery] = useState('')

  // Tema Claro / Escuro
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('gestor_pops_theme') as 'light' | 'dark') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('gestor_pops_theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  // Notificações Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const showToast = (text: string, type: 'success' | 'warn' | 'error' | 'info' = 'info') => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5)
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3200)
  }

  // Modais e Gavetas
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [transferringTask, setTransferringTask] = useState<Task | null>(null)
  const [activePopForDrawer, setActivePopForDrawer] = useState<Pop | null>(null)

  // Salvar tarefas com sincronização
  const updateAndSaveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    saveTasks(newTasks)
  }

  // Contagem de atrasadas para o badge do usuário autenticado
  const todayStr = getTodayDateStr()
  const lateCount = tasks.filter(t => {
    return t.status !== 'Concluida' && t.due_date < todayStr && t.assigned_to === currentUser?.id
  }).length

  // Estado de Carregamento / Restauração de Sessão
  if (isLoadingSession) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        gap: '14px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '18px',
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.35)'
        }}>
          DCX
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-muted)',
          fontSize: '13px'
        }}>
          <div style={{
            width: '14px',
            height: '14px',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span>Verificando sessão segura...</span>
        </div>
      </div>
    )
  }

  // Se não estiver logado -> LoginView
  if (!currentUser) {
    return <LoginView />
  }

  // Se estiver logado mas com status não aprovado (pendente, suspenso ou rejeitado) -> tela de aviso
  if (!isApproved) {
    return <PendingApprovalView />
  }

  // AÇÕES SOBRE AS TAREFAS
  const handleSaveTask = (taskData: Partial<Task>) => {
    if (editingTask) {
      // Edição de tarefa existente
      const updated = tasks.map(t => t.id === editingTask.id ? { ...t, ...taskData, updated_at: new Date().toISOString() } : t)
      updateAndSaveTasks(updated)
      addAuditLog({
        task_id: editingTask.id,
        action: 'edicao',
        actor_id: currentUser.id,
        actor_name: currentUser.name,
        details: { changes: taskData }
      })
      showToast('Tarefa atualizada com sucesso!', 'success')
    } else {
      // Criação de nova tarefa
      const newTask: Task = {
        id: 'task_' + Date.now(),
        title: taskData.title || '',
        description: taskData.description,
        assigned_to: taskData.assigned_to || currentUser.id,
        assigned_to_name: taskData.assigned_to_name || currentUser.name,
        assigned_to_color: taskData.assigned_to_color || currentUser.avatar_color,
        created_by: currentUser.id,
        created_by_name: currentUser.name,
        due_date: taskData.due_date || todayStr,
        all_day: taskData.all_day ?? true,
        start_time: taskData.start_time,
        end_time: taskData.end_time,
        priority: taskData.priority || 'Media',
        status: 'Em Aberto',
        recurrence_type: taskData.recurrence_type || 'none',
        is_meeting: false,
        sort_order: tasks.length + 1,
        pop_id: taskData.pop_id,
        pop_title: taskData.pop_title,
        pop_version: taskData.pop_version,
        subtasks: taskData.subtasks || [],
        created_at: new Date().toISOString()
      }
      updateAndSaveTasks([newTask, ...tasks])
      addAuditLog({
        task_id: newTask.id,
        action: 'criacao',
        actor_id: currentUser.id,
        actor_name: currentUser.name,
        new_assigned_to: newTask.assigned_to,
        new_assigned_name: newTask.assigned_to_name
      })
      showToast('Nova tarefa criada com sucesso!', 'success')
    }
    setTaskModalOpen(false)
    setEditingTask(null)
  }

  // Conclusão com rastreabilidade
  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const now = new Date().toISOString()
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'Concluida' as const,
          completed_at: now,
          completed_by: currentUser.id,
          completed_by_name: currentUser.name
        }
      }
      return t
    })

    updateAndSaveTasks(updated)
    addAuditLog({
      task_id: taskId,
      action: 'conclusao',
      actor_id: currentUser.id,
      actor_name: currentUser.name
    })
    showToast('Tarefa concluída! Movida para o histórico.', 'success')
  }

  // Reabertura restrita à ocorrência individual (Conforme decisão aprovada)
  const handleReopenTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const now = new Date().toISOString()
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'Em Aberto' as const,
          due_date: todayStr, // Restaura para a fila de hoje
          completed_at: null,
          completed_by: null,
          completed_by_name: null,
          reopened_at: now,
          reopened_by: currentUser.id,
          reopened_by_name: currentUser.name
        }
      }
      return t
    })

    updateAndSaveTasks(updated)
    addAuditLog({
      task_id: taskId,
      action: 'reabertura',
      actor_id: currentUser.id,
      actor_name: currentUser.name,
      details: { note: 'Reabertura estrita da ocorrência pontual' }
    })
    showToast('Tarefa reaberta e transferida para a fila ativa de hoje!', 'info')
  }

  // Alternar status Em Aberto <-> Em Andamento
  const handleCycleStatus = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const newStatus: Task['status'] = task.status === 'Em Aberto' ? 'Em Andamento' : 'Em Aberto'

    const updated = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    updateAndSaveTasks(updated)
  }

  // Transferência de tarefa autorizada com justificativa
  const handleConfirmTransfer = (newAssignedId: string, reason: string) => {
    if (!transferringTask) return

    const previousAssignedId = transferringTask.assigned_to
    const previousAssignedName = transferringTask.assigned_to_name

    const updated = tasks.map(t => {
      if (t.id === transferringTask.id) {
        return {
          ...t,
          assigned_to: newAssignedId,
          assigned_to_name: 'Colaborador',
          updated_at: new Date().toISOString()
        }
      }
      return t
    })

    updateAndSaveTasks(updated)
    addAuditLog({
      task_id: transferringTask.id,
      action: 'transferencia',
      actor_id: currentUser.id,
      actor_name: currentUser.name,
      previous_assigned_to: previousAssignedId,
      previous_assigned_name: previousAssignedName,
      new_assigned_to: newAssignedId,
      details: { reason }
    })

    showToast('Responsabilidade da tarefa transferida com sucesso!', 'success')
    setTransferringTask(null)
  }

  // Exclusão de tarefa (apenas gestora e proprietário)
  const handleDeleteTask = (taskId: string) => {
    if (isOperador) {
      alert('Operadores não possuem permissão para excluir tarefas. Você pode transferi-la ou concluí-la.')
      return
    }
    const confirmDelete = window.confirm('Deseja realmente excluir esta tarefa? Esta ação não pode ser desfeita.')
    if (confirmDelete) {
      const updated = tasks.filter(t => t.id !== taskId)
      updateAndSaveTasks(updated)
      addAuditLog({
        task_id: taskId,
        action: 'exclusao',
        actor_id: currentUser.id,
        actor_name: currentUser.name
      })
      showToast('Tarefa removida.', 'warn')
    }
  }

  // Alternar subtarefa
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubs = t.subtasks.map(s => {
          if (s.id === subtaskId) {
            return { ...s, is_completed: !s.is_completed }
          }
          return s
        })
        return { ...t, subtasks: updatedSubs }
      }
      return t
    })
    updateAndSaveTasks(updated)
  }

  return (
    <div className="app-container">
      {/* Barra Lateral Fixa */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        lateTasksCount={lateCount}
      />

      {/* Conteúdo Principal */}
      <div className="main-content">
        <Topbar
          activePage={activePage}
          onOpenNewTask={() => {
            setEditingTask(null)
            setTaskModalOpen(true)
          }}
          theme={theme}
          toggleTheme={toggleTheme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <main className="page-body">
          {activePage === 'tasks' && (
            <TasksPage
              tasks={tasks}
              onOpenEditTask={(task) => {
                setEditingTask(task)
                setTaskModalOpen(true)
              }}
              onOpenTransferTask={(task) => setTransferringTask(task)}
              onOpenPopDrawer={(pop) => setActivePopForDrawer(pop)}
              onToggleSubtask={handleToggleSubtask}
              onCompleteTask={handleCompleteTask}
              onCycleStatus={handleCycleStatus}
              onDeleteTask={handleDeleteTask}
              searchQuery={searchQuery}
            />
          )}

          {activePage === 'atrasadas' && (
            <AtrasadasPage
              tasks={tasks}
              onCompleteTask={handleCompleteTask}
              onOpenTransferTask={(task) => setTransferringTask(task)}
              onOpenPopDrawer={(pop) => setActivePopForDrawer(pop)}
            />
          )}

          {activePage === 'history' && (
            <HistoryPage
              tasks={tasks}
              onReopenTask={handleReopenTask}
            />
          )}

          {activePage === 'pops' && (
            <PopsPage
              onOpenPopDrawer={(pop) => setActivePopForDrawer(pop)}
            />
          )}

          {activePage === 'team' && (
            <TeamPage
              tasks={tasks}
              onOpenEditTask={(task) => {
                setEditingTask(task)
                setTaskModalOpen(true)
              }}
              onOpenTransferTask={(task) => setTransferringTask(task)}
              onOpenPopDrawer={(pop) => setActivePopForDrawer(pop)}
              onCompleteTask={handleCompleteTask}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activePage === 'meetings' && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Reuniões & Compromissos</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Módulo complementar de agendamentos internos (previsto para expansão nas próximas etapas).
              </p>
            </div>
          )}

          {activePage === 'messages' && (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Mensagens Diretas</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Comunicação segura e direta entre membros da equipe com sincronização instantânea.
              </p>
            </div>
          )}

          {activePage === 'settings' && isProprietario && (
            <SettingsPage showToast={showToast} />
          )}
        </main>
      </div>

      {/* Modal de Nova / Editar Tarefa */}
      {taskModalOpen && (
        <TaskModal
          editTask={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setTaskModalOpen(false)
            setEditingTask(null)
          }}
        />
      )}

      {/* Modal de Transferência de Tarefa */}
      {transferringTask && (
        <TransferModal
          task={transferringTask}
          onConfirm={handleConfirmTransfer}
          onClose={() => setTransferringTask(null)}
        />
      )}

      {/* Gaveta Retrátil de POP (Abre ao lado da tarefa) */}
      {activePopForDrawer && (
        <PopDrawer
          pop={activePopForDrawer}
          onClose={() => setActivePopForDrawer(null)}
        />
      )}

      {/* Container de Toasts */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))}
      />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
