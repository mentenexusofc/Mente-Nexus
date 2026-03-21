import { useState, useEffect } from 'react';
import { Users, Plus, Search, Trash2, Edit3, Eye, Phone, Mail, Calendar, CreditCard, ArrowLeft, X } from 'lucide-react';
import { getPacientes, salvarPaciente, deletarPaciente, getConsultas } from '../db';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Paciente {
  id?: string;
  nome: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  cpf?: string;
  endereco?: string;
  observacoes?: string;
}

export default function Patients() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Paciente | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Paciente | null>(null);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    nome: '',
    data_nascimento: '',
    cpf: '',
    telefone: '',
    email: '',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([getPacientes(), getConsultas()]);
      setPacientes(p || []);
      setConsultas(c || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const filtered = pacientes.filter(p =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    (p.cpf || '').includes(search)
  );

  const formatCPF = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 10) {
      return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return nums.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const resetForm = () => {
    setFormData({ nome: '', data_nascimento: '', cpf: '', telefone: '', email: '' });
    setEditingPatient(null);
    setShowForm(false);
  };

  const handleEdit = (paciente: Paciente) => {
    setFormData({
      nome: paciente.nome,
      data_nascimento: paciente.data_nascimento || '',
      cpf: paciente.cpf || '',
      telefone: paciente.telefone || '',
      email: paciente.email || '',
    });
    setEditingPatient(paciente);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await salvarPaciente({ ...formData, id: editingPatient?.id });
      resetForm();
      carregarDados();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza? Isso também excluirá todas as consultas do paciente.')) {
      try {
        await deletarPaciente(id);
        carregarDados();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try { return format(parseISO(dateStr), 'dd/MM/yyyy'); } catch { return dateStr; }
  };

  const formatDateLong = (dateStr?: string) => {
    if (!dateStr) return '—';
    try { return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch { return dateStr; }
  };

  // Detalhe do paciente
  if (viewingPatient) {
    const consultasPaciente = consultas
      .filter((c: any) => c.paciente_id === viewingPatient.id)
      .sort((a: any, b: any) => b.data.localeCompare(a.data));
    const totalGasto = consultasPaciente
      .filter((c: any) => c.status === 'concluida')
      .reduce((sum: number, c: any) => sum + Number(c.valor), 0);
    const totalConsultas = consultasPaciente.filter((c: any) => c.status === 'concluida').length;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setViewingPatient(null)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para lista
        </button>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/25">
              {viewingPatient.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{viewingPatient.nome}</h1>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                {viewingPatient.cpf && (
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> {viewingPatient.cpf}
                  </span>
                )}
                {viewingPatient.data_nascimento && (
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {formatDate(viewingPatient.data_nascimento)}
                  </span>
                )}
                {viewingPatient.telefone && (
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {viewingPatient.telefone}
                  </span>
                )}
                {viewingPatient.email && (
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> {viewingPatient.email}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleEdit(viewingPatient)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Editar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total de Consultas</p>
            <p className="text-2xl font-bold text-white mt-1">{totalConsultas}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total Investido</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-500">Última Consulta</p>
            <p className="text-2xl font-bold text-white mt-1">
              {consultasPaciente.length > 0 ? formatDate(consultasPaciente[0].data) : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Histórico de Consultas</h2>
          {consultasPaciente.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma consulta registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {consultasPaciente.map((c: any) => {
                const statusColor = c.status === 'concluida' ? 'border-l-emerald-500' : c.status === 'cancelada' ? 'border-l-red-500' : 'border-l-amber-500';
                const statusBadge = c.status === 'concluida' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : c.status === 'cancelada' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                return (
                  <div key={c.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-white/5 border-l-4 ${statusColor}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-medium text-white">{formatDateLong(c.data)}</p>
                        <span className="text-sm text-gray-500">às {c.hora}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${statusBadge}`}>{c.status}</span>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-emerald-400">
                      R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Pacientes</h1>
          <p className="text-gray-400 mt-1">{pacientes.length} paciente(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          placeholder="Buscar por nome ou CPF..."
        />
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1035] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome Completo *</label>
                <input type="text" value={formData.nome} onChange={e => setFormData(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Nome do paciente" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data de Nascimento</label>
                <input type="date" value={formData.data_nascimento} onChange={e => setFormData(f => ({ ...f, data_nascimento: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">CPF</label>
                <input type="text" value={formData.cpf} onChange={e => setFormData(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input type="text" value={formData.telefone} onChange={e => setFormData(f => ({ ...f, telefone: formatPhone(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">E-mail</label>
                <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="email@exemplo.com" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm}
                  className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer text-sm">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 cursor-pointer text-sm">
                  {editingPatient ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">{search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}</p>
          {!search && (
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              + Cadastrar primeiro paciente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(paciente => {
            const consultasPaciente = consultas.filter((c: any) => c.paciente_id === paciente.id);
            const ultima = consultasPaciente.filter((c: any) => c.status === 'concluida').sort((a: any, b: any) => b.data.localeCompare(a.data))[0];
            return (
              <div key={paciente.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border border-purple-500/20 flex items-center justify-center text-white font-bold shrink-0">
                    {paciente.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{paciente.nome}</h3>
                    {paciente.cpf && <p className="text-xs text-gray-500 mt-0.5">{paciente.cpf}</p>}
                    {paciente.data_nascimento && <p className="text-xs text-gray-600 mt-0.5">Nasc: {formatDate(paciente.data_nascimento)}</p>}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {consultasPaciente.length} consulta(s)
                    {ultima && ` • Última: ${formatDate(ultima.data)}`}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewingPatient(paciente)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer" title="Ver detalhes">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(paciente)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer" title="Editar">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(paciente.id!)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}