import { Users, CalendarDays, DollarSign, Clock, TrendingUp, Activity } from 'lucide-react';
import { getPatients, getAppointments } from '../store';
import { format, parseISO, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  onNavigate: (page: 'agenda' | 'patients') => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const patients = getPatients();
  const appointments = getAppointments();
  const today = format(new Date(), 'yyyy-MM-dd');

  const todayAppointments = appointments.filter(a => a.date === today);
  const completedThisMonth = appointments.filter(a => {
    try {
      return a.status === 'concluída' && isThisMonth(parseISO(a.date));
    } catch { return false; }
  });
  const monthRevenue = completedThisMonth.reduce((sum, a) => sum + a.value, 0);
  const scheduledAppointments = appointments.filter(a => a.status === 'agendada');

  const upcomingAppointments = appointments
    .filter(a => a.date >= today && a.status === 'agendada')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);

  const recentAppointments = appointments
    .filter(a => a.status === 'concluída')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const stats = [
    { label: 'Pacientes', value: patients.length, icon: Users, color: 'from-purple-600 to-purple-400', shadow: 'shadow-purple-500/25' },
    { label: 'Consultas Hoje', value: todayAppointments.length, icon: CalendarDays, color: 'from-cyan-600 to-cyan-400', shadow: 'shadow-cyan-500/25' },
    { label: 'Agendadas', value: scheduledAppointments.length, icon: Clock, color: 'from-amber-600 to-amber-400', shadow: 'shadow-amber-500/25' },
    { label: 'Receita do Mês', value: `R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'from-emerald-600 to-emerald-400', shadow: 'shadow-emerald-500/25' },
  ];

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Próximas Consultas</h2>
            </div>
            <button onClick={() => onNavigate('agenda')} className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              Ver agenda →
            </button>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma consulta agendada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map(appt => (
                <div key={appt.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-all">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-600/20 to-purple-600/20 border border-cyan-500/20 flex flex-col items-center justify-center">
                    <span className="text-xs text-cyan-400 font-bold">{appt.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{appt.patientName}</p>
                    <p className="text-xs text-gray-500">{formatDate(appt.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      R$ {appt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completed */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Consultas Concluídas</h2>
            </div>
            <button onClick={() => onNavigate('patients')} className="text-sm text-purple-400 hover:text-purple-300 cursor-pointer">
              Ver pacientes →
            </button>
          </div>

          {recentAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhuma consulta concluída</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAppointments.map(appt => (
                <div key={appt.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-all">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-400 text-sm">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{appt.patientName}</p>
                    <p className="text-xs text-gray-500">{formatDate(appt.date)} às {appt.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      R$ {appt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
