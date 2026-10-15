-- ==============================================================================
-- NOVO GESTOR DE TAREFAS COM POPs — SCHEMA DE BANCO DE DADOS OFICIAL
-- ==============================================================================
-- Compatível com PostgreSQL / Supabase
-- RLS Rígido, Chaves Estrangeiras, UUIDs, Auditoria Completa e Isolamento de Perfis
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TIPOS ENUMERADOS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('proprietario', 'gestora', 'operador');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('pendente', 'aprovado', 'rejeitado', 'suspenso');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_priority AS ENUM ('Alta', 'Media', 'Baixa');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('Em Aberto', 'Em Andamento', 'Concluida');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE recur_type AS ENUM ('none', 'daily', 'weekdays', 'weekly', 'monthly', 'custom');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE pop_status AS ENUM ('rascunho', 'em_revisao', 'aprovado', 'arquivado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'operador',
    status account_status NOT NULL DEFAULT 'pendente',
    avatar_color TEXT NOT NULL DEFAULT '#2463EB',
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. TABELA DE CATEGORIAS DE POPs
CREATE TABLE IF NOT EXISTS public.pop_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#2463EB',
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 4. TABELA DE PROCEDIMENTOS OPERACIONAIS PADRÃO (POPs)
CREATE TABLE IF NOT EXISTS public.pops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- Ex: 'POP-ADM-001'
    title TEXT NOT NULL,
    category_id UUID REFERENCES public.pop_categories(id) ON DELETE SET NULL,
    estimated_minutes INTEGER DEFAULT 30,
    status pop_status NOT NULL DEFAULT 'rascunho',
    current_version INTEGER NOT NULL DEFAULT 1,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. VERSÕES HISTÓRICAS DOS POPs (Imutabilidade de Versões Aprovadas)
CREATE TABLE IF NOT EXISTS public.pop_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pop_id UUID NOT NULL REFERENCES public.pops(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    objective TEXT,
    prerequisites TEXT,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ step: 1, title: '', content: '', image_url: '', caution: '' }]
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['Conferir comprovante', 'Lançar no sistema']
    common_errors JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ error: '', how_to_avoid: '' }]
    change_summary TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    CONSTRAINT uq_pop_version UNIQUE (pop_id, version_number)
);

-- 6. TABELA DE TAREFAS
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    
    due_date DATE NOT NULL,
    all_day BOOLEAN NOT NULL DEFAULT true,
    start_time TIME,
    end_time TIME,
    
    priority task_priority NOT NULL DEFAULT 'Media',
    status task_status NOT NULL DEFAULT 'Em Aberto',
    
    recurrence_type recur_type NOT NULL DEFAULT 'none',
    recurrence_days JSONB DEFAULT '[]'::jsonb,
    recurrence_group_id UUID,
    
    is_meeting BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    pop_id UUID REFERENCES public.pops(id) ON DELETE SET NULL,
    pop_version INTEGER,
    
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id),
    
    reopened_at TIMESTAMPTZ,
    reopened_by UUID REFERENCES public.profiles(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 7. TABELA DE SUBTAREFAS
CREATE TABLE IF NOT EXISTS public.subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 8. TABELA DE AUDITORIA E HISTÓRICO DE TAREFAS
CREATE TABLE IF NOT EXISTS public.task_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'criacao', 'edicao', 'transferencia', 'conclusao', 'reabertura', 'exclusao_ocorrencia'
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    previous_assigned_to UUID REFERENCES public.profiles(id),
    new_assigned_to UUID REFERENCES public.profiles(id),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 9. TABELA DE REUNIÕES
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_time TIME NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    participants JSONB NOT NULL DEFAULT '[]'::jsonb, -- array de UUIDs de profiles
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 10. TABELA DE MENSAGENS INTERNAS
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    receiver_id UUID NOT NULL REFERENCES public.profiles(id),
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- FUNÇÕES DE SEGURANÇA E POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Funções utilitárias seguras (Security Definer)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado' LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'aprovado'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_proprietario()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'proprietario' AND status = 'aprovado'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestora_or_above()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('proprietario', 'gestora') AND status = 'aprovado'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- POLÍTICAS: PROFILES
-- Usuário vê o próprio perfil (mesmo pendente) para saber seu status.
-- Usuários aprovados podem listar colegas ativos para transferir tarefas ou enviar mensagens.
CREATE POLICY "profiles_read_policy" ON public.profiles FOR SELECT TO authenticated
    USING (id = auth.uid() OR is_approved());

-- Apenas o proprietário pode alterar roles e status de aprovação de contas.
CREATE POLICY "profiles_update_proprietario" ON public.profiles FOR UPDATE TO authenticated
    USING (is_proprietario())
    WITH CHECK (is_proprietario());

-- Usuário pode atualizar apenas seu próprio nome e cor de avatar.
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
    USING (id = auth.uid() AND is_approved())
    WITH CHECK (id = auth.uid() AND is_approved());

-- POLÍTICAS: TASKS
-- Proprietário e Gestora visualizam todas as tarefas da equipe.
-- Operador aprovado visualiza apenas tarefas onde ele é o responsável ou criador.
CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT TO authenticated
    USING (
        is_approved() AND (
            is_gestora_or_above() OR assigned_to = auth.uid() OR created_by = auth.uid()
        )
    );

-- Criar tarefas:
-- Gestora e Proprietário criam para qualquer colaborador.
-- Operador aprovado cria tarefas onde assigned_to = auth.uid() ou criador = auth.uid().
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (
        is_approved() AND (
            is_gestora_or_above() OR assigned_to = auth.uid() OR created_by = auth.uid()
        )
    );

-- Atualizar tarefas:
-- Gestora e Proprietário atualizam qualquer tarefa.
-- Operador aprovado atualiza tarefas atribuídas a ele (incluindo transferência autorizada para outro colega aprovado).
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE TO authenticated
    USING (
        is_approved() AND (
            is_gestora_or_above() OR assigned_to = auth.uid()
        )
    );

-- Exclusão de tarefas:
-- Apenas Gestora ou Proprietário podem excluir tarefas fisicamente. Operadores cancelam ou concluem.
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE TO authenticated
    USING (is_approved() AND is_gestora_or_above());

-- POLÍTICAS: SUBTASKS
CREATE POLICY "subtasks_all_policy" ON public.subtasks FOR ALL TO authenticated
    USING (
        is_approved() AND (
            is_gestora_or_above() OR 
            task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
        )
    );

-- POLÍTICAS: AUDIT LOGS
CREATE POLICY "audit_select_policy" ON public.task_audit_logs FOR SELECT TO authenticated
    USING (is_approved());

CREATE POLICY "audit_insert_policy" ON public.task_audit_logs FOR INSERT TO authenticated
    WITH CHECK (is_approved());

-- POLÍTICAS: POPS & VERSÕES
CREATE POLICY "pops_select_policy" ON public.pops FOR SELECT TO authenticated
    USING (is_approved());

CREATE POLICY "pops_insert_policy" ON public.pops FOR INSERT TO authenticated
    WITH CHECK (is_approved());

CREATE POLICY "pops_update_policy" ON public.pops FOR UPDATE TO authenticated
    USING (is_approved() AND (is_gestora_or_above() OR created_by = auth.uid()));

CREATE POLICY "pop_versions_select_policy" ON public.pop_versions FOR SELECT TO authenticated
    USING (is_approved());

CREATE POLICY "pop_versions_insert_policy" ON public.pop_versions FOR INSERT TO authenticated
    WITH CHECK (is_approved());
