-- ==============================================================================
-- DCX GESTÃO — SCHEMA OFICIAL DO BANCO DE DADOS (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Versão: 2.1.0 (Homologação de Segurança Refinada)
-- Arquitetura: RLS Rígido, Multi-tenant Lógico, Dupla Camada DCL + RLS,
-- Triggers de Auditoria Confiável no Servidor, Imutabilidade Estrita de POPs e Auditoria,
-- Isolamento Pessoal de Operador e Validação Exaustiva de Transferência.
--
-- AVISO DE IDEMPOTÊNCIA E COMPATIBILIDADE:
-- Este script foi projetado para execução em projetos Supabase NOVOS e LIMPOS.
-- Caso seja aplicado sobre estruturas preexistentes, 'CREATE TABLE IF NOT EXISTS'
-- não altera colunas antigas. Em bancos existentes, execute migrações específicas.
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

-- 5. VERSÕES HISTÓRICAS DOS POPs (Imutabilidade Estrita: ON DELETE RESTRICT)
-- Proteção contra exclusão em cascata: versões de POPs NUNCA podem ser apagadas
CREATE TABLE IF NOT EXISTS public.pop_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pop_id UUID NOT NULL REFERENCES public.pops(id) ON DELETE RESTRICT,
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

-- 8. TABELA DE AUDITORIA E HISTÓRICO DE TAREFAS (APPEND-ONLY, RETENÇÃO PERMANENTE)
-- Nota: ON DELETE SET NULL preserva a linha de auditoria com task_title mesmo se a tarefa for excluída
CREATE TABLE IF NOT EXISTS public.task_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    task_title TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_pop_versions_pop_id ON public.pop_versions(pop_id);

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
-- Impede que usuários comuns alterem role, status ou approved_by.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Exceção segura e controlada: Bootstrap do primeiro proprietário via SQL Editor
    IF current_setting('app.bootstrap_first_owner', true) = 'true' THEN
        -- Permite a promoção apenas se comprovadamente não houver nenhum outro proprietário no sistema
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'proprietario' AND status = 'aprovado') THEN
            NEW.updated_at = now();
            RETURN NEW;
        END IF;
    END IF;

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
-- GATILHO DE PROTEÇÃO DE TAREFAS: TRANSFERÊNCIA ESTREITA E PRESERVAÇÃO DE CAMPOS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_task_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    v_is_admin := public.is_gestora_or_above();

    -- Se for Gestora ou Proprietário aprovado, possui permissão administrativa plena
    IF v_is_admin THEN
        NEW.updated_at = now();
        RETURN NEW;
    END IF;

    -- ── Regras Estritas para o Operador ──────────────────────────────────────
    -- 1. O operador só pode modificar tarefas onde ele é o responsável atual
    IF OLD.assigned_to != auth.uid() THEN
        RAISE EXCEPTION 'Acesso Negado: Você só pode atualizar tarefas atualmente atribuídas a você.';
    END IF;

    -- 2. Não pode alterar a autoria original da tarefa nem o identificador
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Acesso Negado: O identificador da tarefa não pode ser alterado.';
    END IF;

    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
        RAISE EXCEPTION 'Acesso Negado: A autoria original da tarefa não pode ser alterada.';
    END IF;

    -- 3. Não pode alterar o POP vinculado (privilégio gerencial)
    IF NEW.pop_id IS DISTINCT FROM OLD.pop_id OR NEW.pop_version IS DISTINCT FROM OLD.pop_version THEN
        RAISE EXCEPTION 'Acesso Negado: Somente a Gestora ou o Proprietário podem alterar o POP vinculado.';
    END IF;

    -- 4. CASO 1: TRANSFERÊNCIA DE RESPONSABILIDADE (Comparação Exaustiva de Campos)
    -- Quando o operador transfere uma tarefa, permite SOMENTE alterar o assigned_to e o updated_at.
    -- É estritamente proibido alterar título, descrição, datas, horários, prioridade, status, recorrência, etc.
    IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
        -- O novo destinatário DEVE ser um usuário aprovado no sistema
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = NEW.assigned_to AND status = 'aprovado'
        ) THEN
            RAISE EXCEPTION 'Acesso Negado: A tarefa só pode ser transferida para um colaborador ativo e aprovado.';
        END IF;

        -- Comparação exaustiva de TODOS os campos de negócio:
        IF NEW.title IS DISTINCT FROM OLD.title OR
           NEW.description IS DISTINCT FROM OLD.description OR
           NEW.due_date IS DISTINCT FROM OLD.due_date OR
           NEW.all_day IS DISTINCT FROM OLD.all_day OR
           NEW.start_time IS DISTINCT FROM OLD.start_time OR
           NEW.end_time IS DISTINCT FROM OLD.end_time OR
           NEW.priority IS DISTINCT FROM OLD.priority OR
           NEW.status IS DISTINCT FROM OLD.status OR
           NEW.recurrence_type IS DISTINCT FROM OLD.recurrence_type OR
           NEW.recurrence_days IS DISTINCT FROM OLD.recurrence_days OR
           NEW.recurrence_group_id IS DISTINCT FROM OLD.recurrence_group_id OR
           NEW.is_meeting IS DISTINCT FROM OLD.is_meeting OR
           NEW.sort_order IS DISTINCT FROM OLD.sort_order OR
           NEW.completed_at IS DISTINCT FROM OLD.completed_at OR
           NEW.completed_by IS DISTINCT FROM OLD.completed_by OR
           NEW.reopened_at IS DISTINCT FROM OLD.reopened_at OR
           NEW.reopened_by IS DISTINCT FROM OLD.reopened_by THEN
            RAISE EXCEPTION 'Acesso Negado: Ao transferir uma tarefa, é estritamente proibido alterar simultaneamente título, descrição, datas, horários, prioridade, status ou qualquer outro campo da atividade.';
        END IF;

    -- 5. CASO 2: EDIÇÃO NORMAL (SEM TRANSFERÊNCIA)
    -- Operador atualiza status, conclusão/reabertura ou detalhes sob sua responsabilidade
    ELSE
        -- Tratamento Confiável de Conclusão / Reabertura
        IF NEW.status = 'Concluida' AND OLD.status != 'Concluida' THEN
            NEW.completed_at = now();
            NEW.completed_by = auth.uid();
        ELSIF NEW.status != 'Concluida' AND OLD.status = 'Concluida' THEN
            NEW.reopened_at = now();
            NEW.reopened_by = auth.uid();
            NEW.completed_at = NULL;
            NEW.completed_by = NULL;
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_task_operations ON public.tasks;
CREATE TRIGGER trg_protect_task_operations
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.protect_task_operations();

-- ==============================================================================
-- GATILHO DE AUDITORIA AUTOMÁTICA DE TAREFAS (APPEND-ONLY / ANTI-ADULTERAÇÃO)
-- ==============================================================================
-- Registra rigorosamente o ator real da alteração. Nunca inventa nem assume o responsável.
CREATE OR REPLACE FUNCTION public.log_task_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_action TEXT;
    v_details JSONB;
    v_actor_id UUID;
BEGIN
    -- Identificação inequívoca do autor da alteração
    v_actor_id := auth.uid();
    
    IF v_actor_id IS NULL THEN
        -- Na criação, se auth.uid() for nulo, aceita apenas se NEW.created_by for explicitado
        IF TG_OP = 'INSERT' AND NEW.created_by IS NOT NULL THEN
            v_actor_id := NEW.created_by;
        ELSE
            RAISE EXCEPTION 'Segurança de Auditoria: Operação abortada. Não é permitido registrar ou alterar tarefas sem identificação inequívoca do autor (auth.uid nulo).';
        END IF;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_action := 'criacao';
        v_details := jsonb_build_object(
            'title', NEW.title,
            'assigned_to', NEW.assigned_to,
            'due_date', NEW.due_date,
            'priority', NEW.priority
        );

        INSERT INTO public.task_audit_logs (
            task_id,
            task_title,
            action,
            actor_id,
            previous_assigned_to,
            new_assigned_to,
            details,
            created_at
        ) VALUES (
            NEW.id,
            NEW.title,
            v_action,
            v_actor_id,
            NULL,
            NEW.assigned_to,
            v_details,
            now()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Detecta o evento real ocorrido no registro
        IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
            v_action := 'transferencia';
            v_details := jsonb_build_object(
                'reason', 'Transferência de responsabilidade',
                'from_user', OLD.assigned_to,
                'to_user', NEW.assigned_to
            );
        ELSIF NEW.status = 'Concluida' AND OLD.status != 'Concluida' THEN
            v_action := 'conclusao';
            v_details := jsonb_build_object('completed_at', NEW.completed_at);
        ELSIF NEW.status != 'Concluida' AND OLD.status = 'Concluida' THEN
            v_action := 'reabertura';
            v_details := jsonb_build_object('reopened_at', NEW.reopened_at);
        ELSE
            v_action := 'edicao';
            v_details := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'old_due_date', OLD.due_date,
                'new_due_date', NEW.due_date
            );
        END IF;

        INSERT INTO public.task_audit_logs (
            task_id,
            task_title,
            action,
            actor_id,
            previous_assigned_to,
            new_assigned_to,
            details,
            created_at
        ) VALUES (
            NEW.id,
            NEW.title,
            v_action,
            v_actor_id,
            OLD.assigned_to,
            NEW.assigned_to,
            v_details,
            now()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_task_audit_trail ON public.tasks;
CREATE TRIGGER trg_task_audit_trail
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.log_task_audit_event();

-- ==============================================================================
-- GATILHOS DE PROTEÇÃO DO CICLO DE VIDA E HISTÓRICO DE POPs
-- ==============================================================================

-- 1. Impede aprovação ou arquivamento não autorizado de POPs
CREATE OR REPLACE FUNCTION public.protect_pop_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Se quem está alterando NÃO é Gestora ou Proprietário aprovado
    IF NOT public.is_gestora_or_above() THEN
        -- Operador não pode aprovar POP
        IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
            RAISE EXCEPTION 'Acesso Negado: Apenas a Gestora ou o Proprietário podem aprovar Procedimentos Operacionais Padrão.';
        END IF;

        -- Operador não pode arquivar POP
        IF NEW.status = 'arquivado' AND OLD.status != 'arquivado' THEN
            RAISE EXCEPTION 'Acesso Negado: Apenas a Gestora ou o Proprietário podem arquivar um POP.';
        END IF;

        -- Operador não pode alterar campos de auditoria de aprovação
        IF NEW.approved_by IS DISTINCT FROM OLD.approved_by OR NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
            RAISE EXCEPTION 'Acesso Negado: Os campos de aprovação são de uso exclusivo da Gestão.';
        END IF;
    ELSE
        -- Quando a Gestora ou Proprietário aprovam, registra automaticamente quem aprovou
        IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
            NEW.approved_by = auth.uid();
            NEW.approved_at = now();
        END IF;
    END IF;

    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pop_lifecycle ON public.pops;
CREATE TRIGGER trg_protect_pop_lifecycle
    BEFORE UPDATE ON public.pops
    FOR EACH ROW EXECUTE FUNCTION public.protect_pop_lifecycle();

-- 2. Impede exclusão física de POPs que possuam histórico de versões
CREATE OR REPLACE FUNCTION public.protect_pop_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.pop_versions WHERE pop_id = OLD.id) THEN
        RAISE EXCEPTION 'Acesso Negado: Não é permitido excluir fisicamente um POP que possui histórico de versões. Utilize o arquivamento (status = arquivado).';
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_pop_delete ON public.pops;
CREATE TRIGGER trg_protect_pop_delete
    BEFORE DELETE ON public.pops
    FOR EACH ROW EXECUTE FUNCTION public.protect_pop_delete();

-- ==============================================================================
-- GATILHO DE PROTEÇÃO DE MENSAGENS INTERNAS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.protect_message_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Apenas o destinatário pode atualizar a mensagem recebida
    IF auth.uid() != OLD.receiver_id THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas o destinatário da mensagem pode atualizar seu status.';
    END IF;

    -- O destinatário só pode atualizar o campo read_at
    IF NEW.sender_id IS DISTINCT FROM OLD.sender_id OR
       NEW.receiver_id IS DISTINCT FROM OLD.receiver_id OR
       NEW.content IS DISTINCT FROM OLD.content OR
       NEW.created_at IS DISTINCT FROM OLD.created_at OR
       NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas o registro de leitura (read_at) pode ser atualizado em mensagens.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_message_updates ON public.messages;
CREATE TRIGGER trg_protect_message_updates
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.protect_message_updates();

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
    -- 0. Lock transacional contra chamadas concorrentes
    PERFORM pg_advisory_xact_lock(hashtext('promover_primeiro_proprietario_lock'));

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

    -- 3. Habilita a flag temporária de sessão para a transação atual (bypass seguro da trigger)
    PERFORM set_config('app.bootstrap_first_owner', 'true', true);

    -- 4. Promove o usuário e aprova a conta
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
GRANT EXECUTE ON FUNCTION public.promover_primeiro_proprietario(TEXT) TO postgres, service_role;

-- ==============================================================================
-- ATIVAÇÃO DE RLS EM TODAS AS TABELAS
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

-- ==============================================================================
-- DUPLA CAMADA DE SEGURANÇA: PRIVILÉGIOS DCL EXPLÍCITOS
-- ==============================================================================

-- 1. Schema Public: Revogação universal de criação e concessão estrita de uso
REVOKE ALL ON SCHEMA public FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Revogação geral de privilégios públicos padrão em tabelas e funções
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;

-- 3. Tabela Profiles: Inserção e Deleção PROIBIDAS para API de usuários
-- Inserção é feita unicamente pela trigger handle_new_user (SECURITY DEFINER)
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.profiles TO authenticated;

-- 4. Tabela Auditoria: Estritamente Append-Only gerada por Triggers internas
-- Nenhuma role de API (nem authenticated) pode fazer INSERT, UPDATE ou DELETE
REVOKE ALL ON public.task_audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.task_audit_logs TO authenticated;

-- 5. Tabela Versões de POPs: Imutabilidade de Conteúdo Histórico
-- UPDATE e DELETE são revogados de todos os usuários da aplicação
REVOKE ALL ON public.pop_versions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.pop_versions TO authenticated;

-- 6. Tabelas Operacionais Gerais para Usuários Autenticados (filtradas por RLS e Triggers)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pop_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;

-- 7. Funções de Consulta e Auxiliares para authenticated
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_proprietario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_gestora_or_above() TO authenticated;

-- ==============================================================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================

-- ── 1. POLÍTICAS: PROFILES ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR (public.is_approved() AND status = 'aprovado')
        OR public.is_proprietario()
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE TO authenticated
    USING (
        public.is_proprietario() 
        OR (id = auth.uid() AND public.is_approved())
    )
    WITH CHECK (
        public.is_proprietario() 
        OR (id = auth.uid() AND public.is_approved())
    );

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE TO authenticated
    USING (public.is_proprietario());

-- ── 2. POLÍTICAS: TASKS (ISOLAMENTO ESTRITO OPERADOR VS. EQUIPE) ──────────────
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks FOR SELECT TO authenticated
    USING (
        public.is_approved() AND (
            public.is_gestora_or_above()
            OR assigned_to = auth.uid()
        )
    );

DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (
        public.is_approved() AND (
            public.is_gestora_or_above()
            OR (assigned_to = auth.uid() AND created_by = auth.uid())
        )
    );

DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks FOR UPDATE TO authenticated
    USING (
        public.is_approved() AND (
            public.is_gestora_or_above()
            OR assigned_to = auth.uid()
        )
    )
    WITH CHECK (
        public.is_approved() AND (
            public.is_gestora_or_above() 
            OR (assigned_to = auth.uid())
            OR EXISTS (SELECT 1 FROM public.profiles WHERE id = assigned_to AND status = 'aprovado')
        )
    );

DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks FOR DELETE TO authenticated
    USING (
        public.is_approved() AND public.is_gestora_or_above()
    );

-- ── 3. POLÍTICAS: SUBTASKS ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "subtasks_all_policy" ON public.subtasks;
CREATE POLICY "subtasks_all_policy" ON public.subtasks FOR ALL TO authenticated
    USING (
        public.is_approved() AND (
            public.is_gestora_or_above() OR 
            task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid())
        )
    )
    WITH CHECK (
        public.is_approved() AND (
            public.is_gestora_or_above() OR 
            task_id IN (SELECT id FROM public.tasks WHERE assigned_to = auth.uid())
        )
    );

-- ── 4. POLÍTICAS: AUDITORIA DE TAREFAS (APPEND-ONLY) ────────────────────────
-- Leitura permitida para usuários aprovados; sem políticas de UPDATE ou DELETE
DROP POLICY IF EXISTS "audit_select_policy" ON public.task_audit_logs;
CREATE POLICY "audit_select_policy" ON public.task_audit_logs FOR SELECT TO authenticated
    USING (public.is_approved());

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
    WITH CHECK (
        public.is_approved() 
        AND created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.pops 
            WHERE id = pop_id 
              AND status != 'arquivado'
              AND (public.is_gestora_or_above() OR created_by = auth.uid())
        )
    );

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
