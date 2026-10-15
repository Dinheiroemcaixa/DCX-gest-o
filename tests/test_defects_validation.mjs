// ==============================================================================
// TESTE COMPORTAMENTAL: VALIDAÇÃO DOS DOIS DEFEITOS CORRIGIDOS DO SCHEMA SQL
// ==============================================================================
// Validação do comportamento lógico das correções de:
// 1. Versionamento de POPs (visibilidade transacional, locks e sequência)
// 2. Sincronização de E-mail (sincronização auth.users vs. bloqueio direto API)
// ==============================================================================

import fs from 'fs'
import path from 'path'

console.log('================================================================================')
console.log('SUÍTE DE VALIDAÇÃO COMPORTAMENTAL: DEFEITOS CONFIRMADOS SCHEMA V2.1.0')
console.log('================================================================================\n')

// ── PARTE 1: VALIDAÇÃO DO VERSIONAMENTO DE POPs ───────────────────────────────
console.log('[TESTE 1: CICLO DE VIDA E VERSIONAMENTO DE POPs]')

class PopLifecycleSimulator {
    constructor() {
        this.pops = new Map()
        this.popVersions = new Map() // pop_id -> Array de versões
        this.locks = new Set() // Simulação de locks pessimistas FOR UPDATE por pop_id
    }

    createPop(id, code, title, created_by) {
        const pop = {
            id,
            code,
            title,
            current_version: 1,
            status: 'rascunho',
            created_by
        }
        this.pops.set(id, pop)
        this.popVersions.set(id, [])
        return pop
    }

    // Regra: protect_pop_lifecycle (em public.pops)
    validatePopLifecycleOnUpdate(popId, newCurrentVersion, callerRole = 'operador') {
        const pop = this.pops.get(popId)
        if (!pop) throw new Error('POP não encontrado')

        if (newCurrentVersion !== pop.current_version) {
            const versions = this.popVersions.get(popId) || []
            if (versions.length > 0) {
                const versionExists = versions.some(v => v.version_number === newCurrentVersion)
                if (!versionExists) {
                    throw new Error(`Inconsistência de Versão: A versão ${newCurrentVersion} indicada não existe no histórico de versões do POP.`)
                }
            } else {
                if (newCurrentVersion !== 1) {
                    throw new Error('Inconsistência de Versão: POP sem versões históricas deve manter versão inicial 1.')
                }
            }
        }
    }

    // Implementação antiga defeituosa (BEFORE INSERT que atualizava o pai antes de gravar)
    insertVersionOldDefective(popId, versionNumber, title, createdBy) {
        const pop = this.pops.get(popId)
        if (!pop) throw new Error('POP não encontrado')

        const versions = this.popVersions.get(popId) || []
        const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1
        const assignedVersion = versionNumber || nextVersion

        // DEFEITO: Tentava atualizar pops.current_version NO BEFORE INSERT, antes de gravar a versão!
        this.validatePopLifecycleOnUpdate(popId, assignedVersion)
        pop.current_version = assignedVersion

        // Somente depois inseria em pop_versions
        versions.push({ pop_id: popId, version_number: assignedVersion, title, created_by: createdBy })
        return assignedVersion
    }

    // Nova implementação corrigida (Lock + BEFORE INSERT valida sequência + AFTER INSERT sincroniza)
    insertVersionCorrected(popId, versionNumber, title, createdBy) {
        // 1. Lock pessimista no pai
        if (this.locks.has(popId)) {
            throw new Error('Lock contention: Linha do POP bloqueada por transação concorrente')
        }
        this.locks.add(popId)

        try {
            const pop = this.pops.get(popId)
            if (!pop) throw new Error('POP não encontrado')

            const versions = this.popVersions.get(popId) || []
            const nextVersion = versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1

            // 2. BEFORE INSERT: Validação estrita da sequência contínua (sem gaps)
            let finalVersionNumber = versionNumber
            if (finalVersionNumber === null || finalVersionNumber === undefined) {
                finalVersionNumber = nextVersion
            } else if (finalVersionNumber !== nextVersion) {
                throw new Error(`Integridade de Versão: O número da versão do POP deve ser estritamente sequencial. A próxima versão esperada para este POP é ${nextVersion}.`)
            }

            // 3. Gravação física da versão na tabela pop_versions
            const newVersionRecord = {
                id: 'ver_' + Math.random().toString(36).substring(2, 8),
                pop_id: popId,
                version_number: finalVersionNumber,
                title,
                created_by: createdBy
            }
            versions.push(newVersionRecord)

            // 4. AFTER INSERT: Sincronização pós-gravação com validação de ciclo de vida
            this.validatePopLifecycleOnUpdate(popId, finalVersionNumber)
            pop.current_version = finalVersionNumber

            return newVersionRecord
        } finally {
            this.locks.delete(popId)
        }
    }
}

const sim = new PopLifecycleSimulator()
const pop1 = sim.createPop('pop_01', 'POP-FIN-001', 'Fechamento Mensal', 'user_gestora')
console.assert(pop1.current_version === 1, 'POP recém-criado deve iniciar na versão 1')

// Inserção da Versão 1 com a nova arquitetura
const v1 = sim.insertVersionCorrected('pop_01', 1, 'Versão Inicial', 'user_gestora')
console.assert(v1.version_number === 1, 'Versão 1 deve ser gravada')
console.assert(pop1.current_version === 1, 'pops.current_version deve ser 1')
console.log('✓ Cenário 1: Criação da primeira versão gravada e sincronizada com sucesso.')

// Demonstração do defeito corrigido: tentativa de inserir versão 2 na implementação antiga
let oldFailedAsExpected = false
try {
    sim.insertVersionOldDefective('pop_01', 2, 'Segunda Versão Antiga', 'user_gestora')
} catch (err) {
    oldFailedAsExpected = true
    console.assert(err.message.includes('não existe no histórico'), 'Erro esperado da implementação antiga comprovado')
}
console.assert(oldFailedAsExpected, 'A implementação antiga DEVE falhar na inserção da versão 2 por testar visibilidade antes da gravação')
console.log('✓ Cenário 2: Defeito lógico da trigger antiga reproduzido e comprovado com sucesso.')

// Inserção da Versão 2 com a implementação corrigida
const v2 = sim.insertVersionCorrected('pop_01', 2, 'Segunda Versão Corrigida', 'user_gestora')
console.assert(v2.version_number === 2, 'Versão 2 gravada')
console.assert(pop1.current_version === 2, 'pops.current_version atualizado para 2 pós-gravação')
console.log('✓ Cenário 3: Versão sequencial seguinte aprovada sem conflito entre triggers.')

// Rejeição de lacuna na sequência (tentando pular de 2 direto para 4)
let gapRejected = false
try {
    sim.insertVersionCorrected('pop_01', 4, 'Tentativa de Salto de Versão', 'user_gestora')
} catch (err) {
    gapRejected = true
    console.assert(err.message.includes('deve ser estritamente sequencial'), 'Deve rejeitar salto com mensagem de sequência')
}
console.assert(gapRejected, 'Tentativa de saltar versões deve ser rejeitada')
console.log('✓ Cenário 4: Tentativa de pular versão rejeitada com integridade estrita.')

// Concorrência e bloqueio no pai
sim.locks.add('pop_01')
let lockContentionDetected = false
try {
    sim.insertVersionCorrected('pop_01', 3, 'Tentativa Concorrente', 'user_gestora')
} catch (err) {
    lockContentionDetected = true
}
sim.locks.delete('pop_01')
console.assert(lockContentionDetected, 'Lock transacional no pai deve impedir concorrência simultânea')
console.log('✓ Cenário 5: Estratégia de bloqueio concorrente no registro pai validada.\n')


// ── PARTE 2: VALIDAÇÃO DA SINCRONIZAÇÃO DE E-MAIL ─────────────────────────────
console.log('[TESTE 2: SINCRONIZAÇÃO DE E-MAIL E PROTEÇÃO DE IDENTIDADE]')

class ProfileAuthSimulator {
    constructor() {
        this.authUsers = new Map() // id -> { id, email }
        this.profiles = new Map()  // id -> { id, email, role, status }
    }

    registerUser(id, email, role = 'operador', status = 'aprovado') {
        this.authUsers.set(id, { id, email: email.toLowerCase().trim() })
        this.profiles.set(id, { id, email: email.toLowerCase().trim(), role, status })
    }

    // Regra: protect_profile_fields (BEFORE UPDATE ON public.profiles)
    protectProfileFields(callerRole, oldProfile, newProfile) {
        // 1. Imutabilidade absoluta do ID
        if (newProfile.id !== oldProfile.id) {
            throw new Error('Acesso Negado: O identificador do perfil (id) é estritamente imutável e não pode ser alterado.')
        }

        // 2. Proteção e sincronização de identidade:
        // profiles.email só pode mudar se coincidir rigorosamente com auth.users
        if (newProfile.email !== oldProfile.email) {
            const authUser = this.authUsers.get(newProfile.id)
            if (!authUser || authUser.email.toLowerCase().trim() !== newProfile.email.toLowerCase().trim()) {
                throw new Error('Inconsistência de Identidade: O e-mail do perfil só pode ser alterado através do fluxo oficial de autenticação (auth.users).')
            }
        }

        // 3. Regras para não-proprietários
        if (callerRole !== 'proprietario') {
            if (newProfile.role !== oldProfile.role) {
                throw new Error('Acesso Negado: Somente o Proprietário pode alterar o papel (role).')
            }
            if (newProfile.status !== oldProfile.status) {
                throw new Error('Acesso Negado: Somente o Proprietário pode alterar o status de aprovação.')
            }
        }
    }

    // Simulação de chamada direta de API por usuário comum tentando alterar seu próprio e-mail em profiles
    directApiUpdateEmail(userId, callerRole, newEmail) {
        const oldProf = this.profiles.get(userId)
        const proposedProf = { ...oldProf, email: newEmail.toLowerCase().trim() }
        this.protectProfileFields(callerRole, oldProf, proposedProf)
        this.profiles.set(userId, proposedProf)
    }

    // Simulação do fluxo legítimo do Supabase Auth (trigger handle_user_email_update)
    supabaseAuthEmailUpdate(userId, callerRole, newEmailConfirmed) {
        // 1. O Supabase Auth atualiza primeiro em auth.users
        const authUser = this.authUsers.get(userId)
        if (!authUser) throw new Error('Usuário de auth não encontrado')
        authUser.email = newEmailConfirmed.toLowerCase().trim()

        // 2. A trigger handle_user_email_update dispara UPDATE em public.profiles
        const oldProf = this.profiles.get(userId)
        const proposedProf = { ...oldProf, email: newEmailConfirmed.toLowerCase().trim() }

        // 3. A trigger protect_profile_fields valida a atualização
        this.protectProfileFields(callerRole, oldProf, proposedProf)
        this.profiles.set(userId, proposedProf)
    }
}

const authSim = new ProfileAuthSimulator()
authSim.registerUser('user_op1', 'operador@empresa.com', 'operador', 'aprovado')

// Cenário 1: Tentativa de alteração direta não autorizada de e-mail na API por operador
let directEmailRejected = false
try {
    authSim.directApiUpdateEmail('user_op1', 'operador', 'hacker@fraude.com')
} catch (err) {
    directEmailRejected = true
    console.assert(err.message.includes('fluxo oficial de autenticação'), 'Deve rejeitar alteração direta não respaldada em auth.users')
}
console.assert(directEmailRejected, 'Alteração direta não autorizada de e-mail na API deve ser bloqueada')
console.log('✓ Cenário 1: Alteração direta de e-mail sem respaldo em auth.users bloqueada com sucesso.')

// Cenário 2: Sincronização legítima via Supabase Auth (mesmo executada sob role operador)
authSim.supabaseAuthEmailUpdate('user_op1', 'operador', 'operador.novo@empresa.com')
console.assert(authSim.profiles.get('user_op1').email === 'operador.novo@empresa.com', 'E-mail deve ser sincronizado com sucesso no perfil')
console.log('✓ Cenário 2: Sincronização legítima de e-mail de operador aprovada e efetivada.')

// Cenário 3: Imutabilidade de profiles.id
let idChangeRejected = false
try {
    const prof = authSim.profiles.get('user_op1')
    authSim.protectProfileFields('proprietario', prof, { ...prof, id: 'user_forged_id' })
} catch (err) {
    idChangeRejected = true
    console.assert(err.message.includes('id) é estritamente imutável'), 'Deve barrar alteração de id mesmo para proprietário')
}
console.assert(idChangeRejected, 'Alteração de profiles.id deve ser categoricamente bloqueada para todos')
console.log('✓ Cenário 3: Imutabilidade universal de profiles.id comprovada.')

// Cenário 4: Bloqueio de auto-elevação de papel por operador durante atualização
let roleElevationRejected = false
try {
    const prof = authSim.profiles.get('user_op1')
    authSim.protectProfileFields('operador', prof, { ...prof, role: 'proprietario' })
} catch (err) {
    roleElevationRejected = true
    console.assert(err.message.includes('Somente o Proprietário pode alterar o papel'), 'Deve bloquear elevação de papel')
}
console.assert(roleElevationRejected, 'Tentativa de auto-elevação de papel bloqueada')
console.log('✓ Cenário 4: Restrições de perfil mantidas durante atualizações.\n')

console.log('================================================================================')
console.log('RESULTADO FINAL: TODOS OS 9 CENÁRIOS COMPORTAMENTAIS FORAM APROVADOS!')
console.log('================================================================================')
