import { supabase } from './lib/supabase'

// ─── PERFIS (SUPABASE) ───────────────────────────────────

export async function getMeuPerfil() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .single();

    if (error) {
        console.error('Erro ao buscar perfil:', error);
        return null;
    }
    return data;
}

export async function atualizarMeuPerfil(dados: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
        .from('perfis')
        .update(dados)
        .eq('id', user.id);
    if (error) throw error;
    return data;
}

export async function getTodosClientes() {
    const { data, error } = await supabase.from('perfis').select('*');
    if (error) throw error;
    return data;
}

export async function criarCliente(dados: any) {
    // Para um admin criar outro cliente via Supabase Auth, o ideal seria uma Edge Function,
    // mas para simplificar vamos fazer o signUp.
    const technicalEmail = `${dados.email.split('@')[0]}@mentenexus.site`;
    const { data, error } = await supabase.auth.signUp({
        email: technicalEmail,
        password: dados.senha,
        options: {
            data: {
                nome_clinica: dados.nome_empresa,
                telefone_clinica: dados.email.split('@')[0], // assumindo que usam telefone no campo email
                titulo_site: dados.titulo_site,
                role: 'user'
            }
        }
    });
    if (error) throw error;
    return data;
}

export async function atualizarCliente(id: string, dados: any) {
    const { data, error } = await supabase
        .from('perfis')
        .update({
            nome_clinica: dados.nome_empresa,
            titulo_site: dados.titulo_site,
            cpf_cnpj: dados.cpf_cnpj,
            google_client_id: dados.google_client_id,
            google_client_secret: dados.google_client_secret
        })
        .eq('id', id);
    if (error) throw error;
    return data;
}

export async function removerCliente(id: string) {
    const { error } = await supabase.from('perfis').delete().eq('id', id);
    if (error) throw error;
}

// ─── PACIENTES (SUPABASE) ────────────────────────────────

export async function getPacientes() {
    const { data, error } = await supabase.from('pacientes').select('*').order('nome');
    if (error) throw error;
    return data;
}

export async function salvarPaciente(paciente: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    if (paciente.id) {
        const { error } = await supabase.from('pacientes').update(paciente).eq('id', paciente.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('pacientes').insert({ ...paciente, clinic_id: user.id });
        if (error) throw error;
    }
}

export async function deletarPaciente(id: string) {
    const { error } = await supabase.from('pacientes').delete().eq('id', id);
    if (error) throw error;
}

// ─── CONSULTAS (SUPABASE) ────────────────────────────────

export async function getConsultas() {
    const { data, error } = await supabase
        .from('consultas')
        .select('*, pacientes(nome)')
        .order('data', { ascending: false });
    if (error) throw error;
    return data;
}

export async function salvarConsulta(consulta: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    if (consulta.id) {
        const { error } = await supabase.from('consultas').update(consulta).eq('id', consulta.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('consultas').insert({ ...consulta, clinic_id: user.id });
        if (error) throw error;
    }
}

export async function deletarConsulta(id: string) {
    const { error } = await supabase.from('consultas').delete().eq('id', id);
    if (error) throw error;
}

// ─── FINANCEIRO (SUPABASE) ───────────────────────────────

export async function getFinanceiro() {
    const { data, error } = await supabase.from('financeiro').select('*').order('data', { ascending: false });
    if (error) throw error;
    return data;
}

export async function salvarFinanceiro(item: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    if (item.id) {
        const { error } = await supabase.from('financeiro').update(item).eq('id', item.id);
        if (error) throw error;
    } else {
        const { error } = await supabase.from('financeiro').insert({ ...item, clinic_id: user.id });
        if (error) throw error;
    }
}

export async function deletarFinanceiro(id: string) {
    const { error } = await supabase.from('financeiro').delete().eq('id', id);
    if (error) throw error;
}

// ─── RESUMO DASHBOARD (SUPABASE) ──────────────────────────

export async function getResumoDashboard() {
    const { count: totalPacientes } = await supabase.from('pacientes').select('*', { count: 'exact', head: true });
    const { count: totalConsultas } = await supabase.from('consultas').select('*', { count: 'exact', head: true });
    
    return {
        pacientes: totalPacientes || 0,
        consultas: totalConsultas || 0,
        receita_mes: 0,
    };
}