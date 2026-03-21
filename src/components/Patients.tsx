import { useState } from 'react';
import { Users, Plus, Search, Trash2, Edit3, Eye, Phone, Mail, Calendar, CreditCard, ArrowLeft, X } from 'lucide-react';
import { getPatients, savePatient, deletePatient, getAppointmentsByPatient } from '../store';
import { Patient } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Patients() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [viewingPatient, setViewingPatient] = useState<Patient | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const patients = getPatients();
  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.cpf.includes(search)
  );

  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    cpf: '',
    phone: '',
    email: '',
  });

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
    setFormData({ name: '', birthDate: '', cpf: '', phone: '', email: '' });
    setEditingPatient(null);
    setShowForm(false);
  };

  const handleEdit = (patient: Patient) => {
    setFormData({
      name: patient.name,
      birthDate: patient.birthDate,
      cpf: patient.cpf,
      phone: patient.phone,
      email: patient.email,
    });
    setEditingPatient(patient);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const patient: Patient = {
      id: editingPatient?.id || crypto.randomUUID(),
      ...formData,
    };
    savePatient(patient);
    resetForm();
    setRefreshKey(k => k + 1);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza? Isso também excluirá todas as consultas do paciente.')) {
      deletePatient(id);
      setRefreshKey(k => k + 1);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatDateLong = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Patient Detail View
  if (viewingPatient) {
    const patientAppointments = getAppointmentsByPatient(viewingPatient.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
    const totalSpent = patientAppointments
      .filter(a => a.status === 'concluída')
      .reduce((sum, a) => sum + a.value, 0);
    const totalConsultas = patientAppointments.filter(a => a.status === 'concluída').length;

    return (
      <div className="space-y-6" key={refreshKey}>
        {/* Back button */}
        <button
          onClick={() => setViewingPatient(null)}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para lista
        </button>

        {/* Patient header card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/25">
              {viewingPatient.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{viewingPatient.name}</h1>
              <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" /> {viewingPatient.cpf}
                </span>
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> {formatDate(viewingPatient.birthDate)}
                </span>
                {viewingPatient.phone && (
                  <span className="text-sm text-gray-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {viewingPatient.phone}
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total de Consultas</p>
            <p className="text-2xl font-bold text-white mt-1">{totalConsultas}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-500">Total Investido</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-500">Última Consulta</p>
            <p className="text-2xl font-bold text-white mt-1">
              {patientAppointments.length > 0 ? formatDate(patientAppointments[0].date) : '—'}
            </p>
          </div>
        </div>

        {/* Appointment history */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Histórico de Consultas</h2>

          {patientAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma consulta registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patientAppointments.map(appt => {
                const statusColor = appt.status === 'concluída'
                  ? 'border-l-emerald-500'
                  : appt.status === 'cancelada'
                  ? 'border-l-red-500'
                  : 'border-l-amber-500';

                const statusBadge = appt.status === 'concluída'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : appt.status === 'cancelada'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                return (
                  <div key={appt.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-white/5 border-l-4 ${statusColor}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-medium text-white">
                          {formatDateLong(appt.date)}
                        </p>
                        <span className="text-sm text-gray-500">às {appt.time}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${statusBadge}`}>
                          {appt.status}
                        </span>
                      </div>
                      {appt.notes && (
                        <p className="text-xs text-gray-500 mt-1">{appt.notes}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold text-emerald-400">
                      R$ {appt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

  // Patient list view
  return (
    <div className="space-y-6" key={refreshKey}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Pacientes</h1>
          <p className="text-gray-400 mt-1">{patients.length} paciente(s) cadastrado(s)</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Paciente
        </button>
      </div>

      {/* Search */}
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

      {/* Form Modal */}
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
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="Nome do paciente"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data de Nascimento *</label>
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={e => setFormData(f => ({ ...f, birthDate: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all [color-scheme:dark]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">CPF *</label>
                <input
                  type="text"
                  value={formData.cpf}
                  onChange={e => setFormData(f => ({ ...f, cpf: formatCPF(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 cursor-pointer text-sm"
                >
                  {editingPatient ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient List */}
      {filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">{search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}</p>
          {!search && (
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="mt-4 text-sm text-purple-400 hover:text-purple-300 cursor-pointer"
            >
              + Cadastrar primeiro paciente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(patient => {
            const appointments = getAppointmentsByPatient(patient.id);
            const lastAppt = appointments
              .filter(a => a.status === 'concluída')
              .sort((a, b) => b.date.localeCompare(a.date))[0];

            return (
              <div
                key={patient.id}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border border-purple-500/20 flex items-center justify-center text-white font-bold shrink-0">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{patient.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{patient.cpf}</p>
                    <p className="text-xs text-gray-600 mt-0.5">Nasc: {formatDate(patient.birthDate)}</p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {appointments.length} consulta(s)
                    {lastAppt && ` • Última: ${formatDate(lastAppt.date)}`}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingPatient(patient)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(patient)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(patient.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Excluir"
                    >
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
