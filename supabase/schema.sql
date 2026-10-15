-- ==============================================================================
-- DCX GESTÃO — SCHEMA OFICIAL DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Arquitetura: Multi-tenant Lógico, RLS Rígido, Funções Security Definer Blindadas,
-- Imutabilidade de Auditoria, Proteção Contra Auto-Elevação de Privilégios e
-- Procedimento Controlado de Ativação do Primeiro Proprietário.
-- ==============================================================================

-- 0. EXTENSÕES NECESSÁRIAS
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

-- 2. TABELA DE PERFIS DE USUÁRIOS (Vinculada a auth.users)
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
    code TEXT NOT NULL UNIQUE,
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

-- 5. VERSÕES HISTÓRICAS DOS POPs (Imutabilidade de Instruções Operacionais)
CREATE TABLE IF NOT EXISTS public.pop_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pop_id UUID NOT NULL REFERENCES public.pops(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    objective TEXT,
    prerequisites TEXT,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    common_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
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

-- 7. TABELA DE SUBTAREFAS / CHECKLISTS
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

-- 8. TABELA DE AUDITORIA E HISTÓRICO DE TAREFAS (APPEND-ONLY)
CREATE TABLE IF NOT EXISTS public.task_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'criacao', 'edicao', 'transferencia', 'conclusao', 'reabertura'
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
    participants JSONB NOT NULL DEFAULT '[]'::jsonb,
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

-- ÍNDICES ESTRATÉGICOS PARA DESEMPENHO E FILTROS OPERACIONAIS
CREATE INDEX IF NOT EXISTS idx_profiles_role_status ON public.profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_due ON public.tasks(assigned_to, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_task_id ON public.task_audit_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_pops_status ON public.pops(status);

-- ==============================================================================
-- FUNÇÕES DE SEGURANÇA E AUXILIARES (SECURITY DEFINER COM SEARCH_PATH BLINDADO)
-- ==============================================================================

-- 1. Obter papel autenticado e aprovado
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles 
    WHERE id = auth.uid() AND status = 'aprovado' 
    LIMIT 1;
$$;

-- 2. Verificar se o usuário atual está aprovado no sistema
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND status = 'aprovado'
    );
$$;

-- 3. Verificar se o usuário atual é o Proprietário aprovado
CREATE OR REPLACE FUNCTION public.is_proprietario()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'proprietario' AND status = 'aprovado'
    );
$$;

-- 4. Verificar se o usuário é Gestora ou Proprietário aprovado
CREATE OR REPLACE FUNCTION public.is_gestora_or_above()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role IN ('proprietario', 'gestora') AND status = 'aprovado'
    );
$$;

-- ==============================================================================
-- GATILHOS DE SEGURANÇA: CRIAÇÃO AUTOMÁTICA E PROTEÇÃO CONTRA AUTO-ELEVAÇÃO
-- ==============================================================================

-- Gatilho 1: Criação Automática e Forçada de Novo Usuário (auth.users -> public.profiles)
-- Todo novo usuário entra COMPULSORIAMENTE como 'operador' e 'pendente'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        name,
        email,
        role,
        status,
        avatar_color,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)),
        LOWER(TRIM(NEW.email)),
        'operador', -- Bloqueio estrito: Impossível injetar 'proprietario' ou 'gestora'
        'pendente', -- Bloqueio estrito: Toda nova conta aguarda aprovação manual
        COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_color'), ''), '#2463EB'),
        now(),
        now()
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Gatilho 2: Proteção de Campos Sensíveis na Atualização de Perfil
-- Impede que usuários comuns alterem role, status ou approved_by via chamadas diretas.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Se quem está executando NÃO é o Proprietário aprovado
    IF NOT public.is_proprietario() THEN
        -- Barrar alteração de papel
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Acesso Negado: Somente o Proprietário do sistema pode alterar o papel (role) de um usuário.';
        END IF;

        -- Barrar alteração de status de aprovação
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Acesso Negado: Somente o Proprietário do sistema pode alterar o status de aprovação de contas.';
        END IF;

        -- Barrar alteração dos campos de aprovação
        IF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
            RAISE EXCEPTION 'Acesso Negado: Campos de auditoria de aprovação são de uso exclusivo do Proprietário.';
        END IF;

        -- Barrar alteração do ID e E-mail
        IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Acesso Negado: Não é permitido alterar o identificador ou o e-mail cadastrado.';
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ==============================================================================
-- PROCEDIMENTO SEGURO PARA ATIVAÇÃO DO PRIMEIRO PROPRIETÁRIO
-- ==============================================================================
-- Executável unicamente no SQL Editor do Supabase (role postgres/service_role).
-- Revogado expressamente para público, anônimos e usuários autenticados da API.
CREATE OR REPLACE FUNCTION public.promover_primeiro_proprietario(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_proprietario_exists BOOLEAN;
BEGIN
    -- 1. Verifica se já existe qualquer Proprietário aprovado no sistema
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE role = 'proprietario' AND status = 'aprovado'
    ) INTO v_proprietario_exists;

    IF v_proprietario_exists THEN
        RAISE EXCEPTION 'Operação cancelada: Já existe um Proprietário ativo no sistema. Novas aprovações devem ser feitas pela interface pelo Proprietário.';
    END IF;

    -- 2. Localiza o usuário cadastrado pelo e-mail
    SELECT id INTO v_user_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(p_email));

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário "%" não encontrado na base. Cadastre-se primeiro no aplicativo ou pelo painel do Supabase Auth.', p_email;
    END IF;

    -- 3. Promove o usuário e aprova a conta
    UPDATE public.profiles
    SET 
        role = 'proprietario',
        status = 'aprovado',
        approved_at = now(),
        updated_at = now()
    WHERE id = v_user_id;

    RETURN 'SUCESSO: O usuário ' || p_email || ' foi promovido a Proprietário com status APROVADO.';
END;
$$;

-- Blindagem de acesso da função: Nunca acessível via API REST
REVOKE ALL ON FUNCTION public.promover_primeiro_proprietario(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promover_primeiro_proprietario(TEXT) TO service_role;

-- ==============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
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

-- ── 1. POLÍTICAS: PROFILES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
    USING (
        -- O usuário sempre pode ver seu próprio perfil (para exibir o aviso de pendência)
        id = auth.uid()
        -- Usuários aprovados podem listar colegas ativos para transferências e colaboração
        OR (public.is_approved() AND status = 'aprovado')
        -- O Proprietário tem acesso irrestrito para gerenciar todas as contas e aprovações
        OR public.is_proprietario()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
    USING (
        -- Proprietário atualiza qualquer perfil
        public.is_proprietario() 
        -- Usuário aprovado pode atualizar seu próprio perfil (nome e avatar_color)
        OR (id = auth.uid() AND public.is_approved())
    )
    WITH CHECK (
        public.is_proprietario() 
        OR (id = auth.uid() AND public.is_approved())
    );

-- INSERT em profiles é proibido via API: acontece exclusivamente pelo gatilho handle_new_user()
DROP POLICY IF EXISTS "profiles_insert_block" ON public.profiles;

-- DELETE de perfis: Apenas o Proprietário pode excluir colaboradores
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE TO authenticated
    USING (public.is_proprietario());

-- ── 2. POLÍTICAS: TASKS ─────────────────────────────────────────────────────
-- Usuários pendentes ou suspensos NÃO possuem acesso algum a tarefas
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT TO authenticated
    USING (
        public.is_approved() AND (
            -- Gestora e Proprietário podem auditar todas as tarefas da equipe
            public.is_gestora_or_above()
            -- Operadores visualizam estritamente as tarefas atribuídas a eles ou criadas por eles
            OR assigned_to = auth.uid() 
            OR created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (
        public.is_approved() AND (
            -- Gestora e Proprietário podem criar e atribuir para qualquer membro da equipe
            public.is_gestora_or_above()
            -- Operadores só podem criar tarefas onde são os responsáveis ou criadores
            OR assigned_to = auth.uid() 
            OR created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE TO authenticated
    USING (
        public.is_approved() AND (
            -- Gestora e Proprietário podem atualizar qualquer tarefa
            public.is_gestora_or_above()
            -- Operadores atualizam tarefas sob sua responsabilidade (conclusão, reabertura, transferência)
            OR assigned_to = auth.uid()
        )
    )
    WITH CHECK (
        public.is_approved() AND (
            public.is_gestora_or_above() 
            OR assigned_to = auth.uid() 
            -- Permite transferir caso a nova atribuição seja para outro colega aprovado
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = assigned_to AND status = 'aprovado')
        )
    );

DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE TO authenticated
    USING (
        -- Apenas Gestora e Proprietário podem remover tarefas fisicamente
        public.is_approved() AND public.is_gestora_or_above()
    );

-- ── 3. POLÍTICAS: SUBTASKS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "subtasks_all_policy" ON public.subtasks;
CREATE POLICY "subtasks_all_policy" ON public.subtasks FOR ALL TO authenticated
    USING (
        public.is_approved() AND (
            public.is_gestora_or_above() OR 
            task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
        )
    )
    WITH CHECK (
        public.is_approved() AND (
            public.is_gestora_or_above() OR 
            task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid() OR created_by = auth.uid())
        )
    );

-- ── 4. POLÍTICAS: AUDITORIA DE TAREFAS (APPEND-ONLY) ────────────────────────
-- Logs de auditoria são imutáveis: NÃO possuem políticas de UPDATE nem de DELETE
DROP POLICY IF EXISTS "audit_select_policy" ON public.task_audit_logs;
CREATE POLICY "audit_select_policy" ON public.task_audit_logs FOR SELECT TO authenticated
    USING (public.is_approved());

DROP POLICY IF EXISTS "audit_insert_policy" ON public.task_audit_logs;
CREATE POLICY "audit_insert_policy" ON public.task_audit_logs FOR INSERT TO authenticated
    WITH CHECK (
        public.is_approved() AND actor_id = auth.uid()
    );

-- ── 5. POLÍTICAS: POPs E CATEGORIAS ─────────────────────────────────────────
DROP POLICY IF EXISTS "categories_select_policy" ON public.pop_categories;
CREATE POLICY "categories_select_policy" ON public.pop_categories FOR SELECT TO authenticated
    USING (public.is_approved());

DROP POLICY IF EXISTS "categories_admin_policy" ON public.pop_categories;
CREATE POLICY "categories_admin_policy" ON public.pop_categories FOR ALL TO authenticated
    USING (public.is_approved() AND public.is_gestora_or_above())
    WITH CHECK (public.is_approved() AND public.is_gestora_or_above());

DROP POLICY IF EXISTS "pops_select_policy" ON public.pops;
CREATE POLICY "pops_select_policy" ON public.pops FOR SELECT TO authenticated
    USING (public.is_approved());

DROP POLICY IF EXISTS "pops_insert_policy" ON public.pops;
CREATE POLICY "pops_insert_policy" ON public.pops FOR INSERT TO authenticated
    WITH CHECK (public.is_approved() AND created_by = auth.uid());

DROP POLICY IF EXISTS "pops_update_policy" ON public.pops;
CREATE POLICY "pops_update_policy" ON public.pops FOR UPDATE TO authenticated
    USING (
        public.is_approved() AND (
            public.is_gestora_or_above() OR created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "pops_delete_policy" ON public.pops;
CREATE POLICY "pops_delete_policy" ON public.pops FOR DELETE TO authenticated
    USING (public.is_approved() AND public.is_proprietario());

-- ── 6. POLÍTICAS: VERSÕES DE POPs (HISTÓRICO IMUTÁVEL) ──────────────────────
DROP POLICY IF EXISTS "pop_versions_select_policy" ON public.pop_versions;
CREATE POLICY "pop_versions_select_policy" ON public.pop_versions FOR SELECT TO authenticated
    USING (public.is_approved());

DROP POLICY IF EXISTS "pop_versions_insert_policy" ON public.pop_versions;
CREATE POLICY "pop_versions_insert_policy" ON public.pop_versions FOR INSERT TO authenticated
    WITH CHECK (public.is_approved() AND created_by = auth.uid());

-- Versões aprovadas de POPs são imutáveis (Sem política de UPDATE)
DROP POLICY IF EXISTS "pop_versions_delete_policy" ON public.pop_versions;
CREATE POLICY "pop_versions_delete_policy" ON public.pop_versions FOR DELETE TO authenticated
    USING (public.is_approved() AND public.is_proprietario());

-- ── 7. POLÍTICAS: REUNIÕES ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "meetings_select_policy" ON public.meetings;
CREATE POLICY "meetings_select_policy" ON public.meetings FOR SELECT TO authenticated
    USING (
        public.is_approved() AND (
            public.is_gestora_or_above()
            OR created_by = auth.uid()
            OR participants @> jsonb_build_array(auth.uid()::text)
        )
    );

DROP POLICY IF EXISTS "meetings_insert_policy" ON public.meetings;
CREATE POLICY "meetings_insert_policy" ON public.meetings FOR INSERT TO authenticated
    WITH CHECK (public.is_approved() AND created_by = auth.uid());

DROP POLICY IF EXISTS "meetings_update_policy" ON public.meetings;
CREATE POLICY "meetings_update_policy" ON public.meetings FOR UPDATE TO authenticated
    USING (public.is_approved() AND (public.is_gestora_or_above() OR created_by = auth.uid()));

DROP POLICY IF EXISTS "meetings_delete_policy" ON public.meetings;
CREATE POLICY "meetings_delete_policy" ON public.meetings FOR DELETE TO authenticated
    USING (public.is_approved() AND (public.is_gestora_or_above() OR created_by = auth.uid()));

-- ── 8. POLÍTICAS: MENSAGENS INTERNAS ────────────────────────────────────────
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
CREATE POLICY "messages_select_policy" ON public.messages FOR SELECT TO authenticated
    USING (
        public.is_approved() AND (
            sender_id = auth.uid() OR receiver_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
CREATE POLICY "messages_insert_policy" ON public.messages FOR INSERT TO authenticated
    WITH CHECK (
        public.is_approved() AND sender_id = auth.uid()
    );

DROP POLICY IF EXISTS "messages_update_policy" ON public.messages;
CREATE POLICY "messages_update_policy" ON public.messages FOR UPDATE TO authenticated
    USING (
        -- Apenas o destinatário pode atualizar a mensagem (para marcar read_at)
        public.is_approved() AND receiver_id = auth.uid()
    );

DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;
CREATE POLICY "messages_delete_policy" ON public.messages FOR DELETE TO authenticated
    USING (
        public.is_approved() AND (sender_id = auth.uid() OR receiver_id = auth.uid())
    );

-- ==============================================================================
-- FIM DO SCHEMA OFICIAL BLINDADO DCX GESTÃO
-- ==============================================================================
