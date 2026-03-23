import { supabase } from './supabaseClient'

// URL base da sua API no Coolify
const API_URL = import.meta.env.VITE_API_URL // ex: https://api.seudominio.com

async function getToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Não autenticado')
    return session.access_token
}

async function api(path: string, options: RequestInit = {}) {
    const token = await getToken()
    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Erro ${res.status}`)
    }
    return res.json()
}

// ─── PERFIS ──────────────────────────────────────────────

export async function getMeuPerfil() {
    return api('/meu-perfil')
}

export async function getTodosClientes() {
    return api('/clientes')
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
    return api('/clientes', {
        method: 'POST',
        body: JSON.stringify(cliente),
    })
}

export async function atualizarCliente(id: string, dados: {
    nome_empresa?: string
    titulo_site?: string
    google_client_id?: string
    google_client_secret?: string
    cpf_cnpj?: string
}) {
    return api(`/clientes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dados),
    })
}

export async function removerCliente(id: string) {
    return api(`/clientes/${id}`, { method: 'DELETE' })
}

// ─── PACIENTES ───────────────────────────────────────────

export async function getPacientes() {
    return api('/pacientes')
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
    if (paciente.id) {
        return api(`/pacientes/${paciente.id}`, {
            method: 'PATCH',
            body: JSON.stringify(paciente),
        })
    }
    return api('/pacientes', {
        method: 'POST',
        body: JSON.stringify(paciente),
    })
}

export async function deletarPaciente(id: string) {
    return api(`/pacientes/${id}`, { method: 'DELETE' })
}

// ─── CONSULTAS ───────────────────────────────────────────

export async function getConsultas() {
    return api('/consultas')
}

export async function getConsultasPorData(data: string) {
    return api(`/consultas?data=${data}`)
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
    if (consulta.id) {
        return api(`/consultas/${consulta.id}`, {
            method: 'PATCH',
            body: JSON.stringify(consulta),
        })
    }
    return api('/consultas', {
        method: 'POST',
        body: JSON.stringify(consulta),
    })
}

export async function deletarConsulta(id: string) {
    return api(`/consultas/${id}`, { method: 'DELETE' })
}

// ─── PRONTUÁRIOS ─────────────────────────────────────────

export async function getProntuario(consultaId: string) {
    return api(`/prontuarios?consulta_id=${consultaId}`)
}

export async function salvarProntuario(prontuario: {
    id?: string
    consulta_id: string
    paciente_id: string
    anotacoes: string
}) {
    if (prontuario.id) {
        return api(`/prontuarios/${prontuario.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ anotacoes: prontuario.anotacoes }),
        })
    }
    return api('/prontuarios', {
        method: 'POST',
        body: JSON.stringify(prontuario),
    })
}

// ─── FINANCEIRO ──────────────────────────────────────────

export async function getFinanceiro() {
    return api('/financeiro')
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
    if (item.id) {
        return api(`/financeiro/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify(item),
        })
    }
    return api('/financeiro', {
        method: 'POST',
        body: JSON.stringify(item),
    })
}

export async function deletarFinanceiro(id: string) {
    return api(`/financeiro/${id}`, { method: 'DELETE' })
}

// ─── RESUMO DASHBOARD ────────────────────────────────────

export async function getResumoDashboard() {
    return api('/dashboard/resumo')
}