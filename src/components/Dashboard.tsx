import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarDays, DollarSign, Clock, TrendingUp, Activity } from 'lucide-react';
import { getResumoDashboard, getConsultas, getPacientes } from '../db';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState({ totalPacientes: 0, consultasHoje: 0, agendadas: 0, receitaMes: 0 });
  const [proximas, setProximas] = useState<any[]>([]);
  const [concluidas, setConcluidas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const [r, consultas, pacientes] = await Promise.all([
        getResumoDashboard(),
        getConsultas(),
        getPacientes(),
      ]);

      setResumo(r);

      const comNome = (c: any) => ({
        ...c,
        patientName: c.pacientes?.nome || pacientes.find((p: any) => p.id === c.paciente_id)?.nome || '—',
      });

      setProximas(
        consultas
          .filter((c: any) => c.data >= hoje && c.status === 'agendada')
          .sort((a: any, b: any) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora))
          .slice(0, 5)
          .map(comNome)
      );

      setConcluidas(
        consultas
          .filter((c: any) => c.status === 'concluida')
          .sort((a: any, b: any) => b.data.localeCompare(a.data))
          .slice(0, 5)
          .map(comNome)
      );
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  const stats = [
    { label: 'Pacientes', value: resumo.totalPacientes, icon: Users, color: 'from-purple-600 to-purple-400', shadow: 'shadow-purple-500/25' },
    { label: 'Consultas Hoje', value: resumo.consultasHoje, icon: CalendarDays, color: 'from-cyan-600 to-cyan-400', shadow: 'shadow-cyan-500/25' },
    { label: 'Agendadas', value: resumo.agendadas, icon: Clock, color: 'from-amber-600 to-amber-400', shadow: 'shadow-amber-500/25' },
    { label: 'Receita do Mês', value: `R$ ${resumo.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'from-emerald-600 to-emerald-400', shadow: 'shadow-emerald-500/25' },
  ];

  const formatDate = (dateStr: string) => {
    try { return format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR }); }
    catch { return dateStr; }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadow}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Próximas Consultas</h2>
            </div>
            <button onClick={() => navigate('/agenda')} className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              Ver agenda →
            </button>
          </div>
          {proximas.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma consulta agendada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proximas.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600/20 to-purple-600/20 border border-cyan-500/20 flex items-center justify-center">
                    <span className="text-xs text-cyan-400 font-bold">{c.hora}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.patientName}</p>
                    <p className="text-xs text-gray-500">{formatDate(c.data)}</p>
                  </div>
                  <p className="text-sm font-medium text-emerald-400">
                    R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Consultas Concluídas</h2>
            </div>
            <button onClick={() => navigate('/patients')} className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              Ver pacientes →
            </button>
          </div>
          {concluidas.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma consulta concluída</p>
            </div>
          ) : (
            <div className="space-y-3">
              {concluidas.map(c => (
                <div key={c.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-all">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 text-sm">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.patientName}</p>
                    <p className="text-xs text-gray-500">{formatDate(c.data)} às {c.hora}</p>
                  </div>
                  <p className="text-sm font-medium text-emerald-400">
                    R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}