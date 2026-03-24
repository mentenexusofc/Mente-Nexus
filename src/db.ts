import { supabase } from './supabaseClient'

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

export async function getTodosClientes() {
    const { data, error } = await supabase.from('perfis').select('*');
    if (error) throw error;
    return data;
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