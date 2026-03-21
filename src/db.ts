import { supabase } from './supabaseClient'

// ─── PACIENTES ───────────────────────────────────────────

export async function getPacientes() {
    const { data, error } = await supabase
        .from('pacientes')
        .select('*')
        .order('nome')
    if (error) throw error
    return data
}

export async function salvarPaciente(paciente: {
    id?: string
    nome: string
    email?: string
    telefone?: string
    data_nascimento?: string
    cpf?: string
    endereco?: string
    observacoes?: string
}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    if (paciente.id) {
        const { error } = await supabase
            .from('pacientes')
            .update(paciente)
            .eq('id', paciente.id)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from('pacientes')
            .insert({ ...paciente, user_id: user.id })
        if (error) throw error
    }
}

export async function deletarPaciente(id: string) {
    const { error } = await supabase
        .from('pacientes')
        .delete()
        .eq('id', id)
    if (error) throw error
}

// ─── CONSULTAS ───────────────────────────────────────────

export async function getConsultas() {
    const { data, error } = await supabase
        .from('consultas')
        .select('*, pacientes(nome)')
        .order('data')
        .order('hora')
    if (error) throw error
    return data
}

export async function getConsultasPorData(data: string) {
    const { data: rows, error } = await supabase
        .from('consultas')
        .select('*, pacientes(nome)')
        .eq('data', data)
        .order('hora')
    if (error) throw error
    return rows
}

export async function salvarConsulta(consulta: {
    id?: string
    paciente_id: string
    data: string
    hora: string
    duracao_minutos?: number
    status?: string
    valor?: number
}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    if (consulta.id) {
        const { error } = await supabase
            .from('consultas')
            .update(consulta)
            .eq('id', consulta.id)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from('consultas')
            .insert({ ...consulta, user_id: user.id })
        if (error) throw error
    }
}

export async function deletarConsulta(id: string) {
    const { error } = await supabase
        .from('consultas')
        .delete()
        .eq('id', id)
    if (error) throw error
}

// ─── PRONTUÁRIOS ─────────────────────────────────────────

export async function getProntuario(consultaId: string) {
    const { data, error } = await supabase
        .from('prontuarios')
        .select('*')
        .eq('consulta_id', consultaId)
        .single()
    if (error && error.code !== 'PGRST116') throw error
    return data
}

export async function salvarProntuario(prontuario: {
    id?: string
    consulta_id: string
    paciente_id: string
    anotacoes: string
}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    if (prontuario.id) {
        const { error } = await supabase
            .from('prontuarios')
            .update({ anotacoes: prontuario.anotacoes, atualizado_em: new Date().toISOString() })
            .eq('id', prontuario.id)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from('prontuarios')
            .insert({ ...prontuario, user_id: user.id })
        if (error) throw error
    }
}

// ─── FINANCEIRO ──────────────────────────────────────────

export async function getFinanceiro() {
    const { data, error } = await supabase
        .from('financeiro')
        .select('*, pacientes(nome)')
        .order('data', { ascending: false })
    if (error) throw error
    return data
}

export async function salvarFinanceiro(item: {
    id?: string
    descricao: string
    valor: number
    tipo: 'receita' | 'despesa'
    status: 'pendente' | 'pago' | 'cancelado'
    data: string
    consulta_id?: string
    paciente_id?: string
}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    if (item.id) {
        const { error } = await supabase
            .from('financeiro')
            .update(item)
            .eq('id', item.id)
        if (error) throw error
    } else {
        const { error } = await supabase
            .from('financeiro')
            .insert({ ...item, user_id: user.id })
        if (error) throw error
    }
}

export async function deletarFinanceiro(id: string) {
    const { error } = await supabase
        .from('financeiro')
        .delete()
        .eq('id', id)
    if (error) throw error
}

// ─── RESUMO DASHBOARD ────────────────────────────────────

export async function getResumoDashboard() {
    const hoje = new Date().toISOString().split('T')[0]

    const [{ count: totalPacientes }, { count: consultasHoje }, { count: agendadas }, { data: receitas }] =
        await Promise.all([
            supabase.from('pacientes').select('*', { count: 'exact', head: true }),
            supabase.from('consultas').select('*', { count: 'exact', head: true }).eq('data', hoje),
            supabase.from('consultas').select('*', { count: 'exact', head: true }).eq('status', 'agendada'),
            supabase.from('financeiro').select('valor').eq('tipo', 'receita').eq('status', 'pago'),
        ])

    const receitaMes = receitas?.reduce((acc, r) => acc + Number(r.valor), 0) || 0

    return {
        totalPacientes: totalPacientes || 0,
        consultasHoje: consultasHoje || 0,
        agendadas: agendadas || 0,
        receitaMes,
    }
}

// ─── PERFIS ──────────────────────────────────────────────

export async function getMeuPerfil() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single()
    return data
}

export async function getTodosClientes() {
    const { data, error } = await supabase
        .from('perfis')
        .select('*, auth_users:id(email)')
        .eq('role', 'client')
        .order('criado_em', { ascending: false })
    if (error) throw error
    return data || []
}

export async function criarCliente(cliente: {
    email: string
    senha: string
    nome_empresa: string
    titulo_site: string
    google_client_id?: string
    google_client_secret?: string
    cpf_cnpj?: string
}) {
    // Cria o usuário no Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
        email: cliente.email,
        password: cliente.senha,
        email_confirm: true,
    })
    if (error) throw error

    // Atualiza o perfil com os dados da empresa + OAuth
    const { error: perfError } = await supabase
        .from('perfis')
        .update({
            nome_empresa: cliente.nome_empresa,
            titulo_site: cliente.titulo_site,
            google_client_id: cliente.google_client_id || null,
            google_client_secret: cliente.google_client_secret || null,
            cpf_cnpj: cliente.cpf_cnpj || null,
            role: 'client',
        })
        .eq('id', data.user.id)
    if (perfError) throw perfError

    return data.user
}

export async function atualizarCliente(id: string, dados: {
    nome_empresa?: string
    titulo_site?: string
    google_client_id?: string
    google_client_secret?: string
    cpf_cnpj?: string
}) {
    const { error } = await supabase
        .from('perfis')
        .update(dados)
        .eq('id', id)
    if (error) throw error
}

export async function removerCliente(id: string) {
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (error) throw error
}