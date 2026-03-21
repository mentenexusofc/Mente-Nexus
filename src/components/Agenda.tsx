import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, Trash2,
  Check, X, Edit3, AlertTriangle, Calendar, Columns3, LayoutGrid, Ban
} from 'lucide-react';
import { getPacientes, getConsultas, salvarConsulta, deletarConsulta } from '../db';
import {
  format, addDays, subDays, parseISO, startOfWeek, endOfWeek,
  addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths,
  isSameMonth, eachDayOfInterval, isToday as isTodayFn, isBefore, getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'day' | 'week' | 'month';

function getEaster(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getBrazilianHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  holidays.set(`${year}-01-01`, 'Confraternização Universal');
  holidays.set(`${year}-04-21`, 'Tiradentes');
  holidays.set(`${year}-05-01`, 'Dia do Trabalho');
  holidays.set(`${year}-09-07`, 'Independência do Brasil');
  holidays.set(`${year}-10-12`, 'Nossa Sra. Aparecida');
  holidays.set(`${year}-11-02`, 'Finados');
  holidays.set(`${year}-11-15`, 'Proclamação da República');
  holidays.set(`${year}-12-25`, 'Natal');
  const easter = getEaster(year);
  const et = easter.getTime();
  holidays.set(format(new Date(et - 47 * 86400000), 'yyyy-MM-dd'), 'Carnaval');
  holidays.set(format(new Date(et - 46 * 86400000), 'yyyy-MM-dd'), 'Carnaval');
  holidays.set(format(new Date(et - 2 * 86400000), 'yyyy-MM-dd'), 'Sexta-feira Santa');
  holidays.set(format(easter, 'yyyy-MM-dd'), 'Páscoa');
  holidays.set(format(new Date(et + 60 * 86400000), 'yyyy-MM-dd'), 'Corpus Christi');
  return holidays;
}

function isHoliday(dateStr: string): string | null {
  const year = parseInt(dateStr.substring(0, 4));
  return getBrazilianHolidays(year).get(dateStr) || null;
}

function isDayBlocked(dateStr: string): { blocked: boolean; reason: string } {
  const day = getDay(parseISO(dateStr));
  if (day === 0) return { blocked: true, reason: 'Domingo' };
  if (day === 6) return { blocked: true, reason: 'Sábado' };
  const holiday = isHoliday(dateStr);
  if (holiday) return { blocked: true, reason: holiday };
  return { blocked: false, reason: '' };
}

const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00'
];

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any | null>(null);
  const [formError, setFormError] = useState('');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    paciente_id: '', date: selectedDate, time: '09:00', value: '', notes: '',
  });

  useEffect(() => { carregarDados(); }, []);

  async function carregarDados() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([getPacientes(), getConsultas()]);
      setPacientes(p || []);
      setConsultas(c || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  const isTimeInPast = (date: string, time: string) => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    if (date < today) return true;
    if (date === today) {
      const [h, m] = time.split(':').map(Number);
      return h < now.getHours() || (h === now.getHours() && m <= now.getMinutes());
    }
    return false;
  };

  const getAvailableTimeSlots = (date: string) =>
    timeSlots.map(t => ({ time: t, isPast: isTimeInPast(date, t) }));

  const getNextWorkingDay = (fromDate: string): string => {
    let d = parseISO(fromDate);
    for (let i = 0; i < 365; i++) {
      const s = format(d, 'yyyy-MM-dd');
      if (!isDayBlocked(s).blocked) return s;
      d = addDays(d, 1);
    }
    return fromDate;
  };

  const resetForm = () => {
    setFormData({ paciente_id: '', date: selectedDate, time: '09:00', value: '', notes: '' });
    setEditingAppt(null);
    setShowForm(false);
    setFormError('');
  };

  const openNewForm = (date?: string) => {
    let target = date || selectedDate;
    if (isDayBlocked(target).blocked) target = getNextWorkingDay(target);
    const slots = getAvailableTimeSlots(target);
    const first = slots.find(s => !s.isPast);
    setFormData({ paciente_id: '', date: target, time: first?.time || '09:00', value: '', notes: '' });
    setEditingAppt(null);
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const blockInfo = isDayBlocked(formData.date);
    if (blockInfo.blocked) { setFormError(`Dia indisponível: ${blockInfo.reason}`); return; }
    if (!editingAppt && isTimeInPast(formData.date, formData.time)) { setFormError('Horário já passou!'); return; }
    if (!formData.paciente_id) { setFormError('Selecione um paciente!'); return; }
    try {
      await salvarConsulta({
        id: editingAppt?.id,
        paciente_id: formData.paciente_id,
        data: formData.date,
        hora: formData.time,
        valor: parseFloat(formData.value) || 0,
        status: editingAppt?.status || 'agendada',
      });
      resetForm();
      carregarDados();
    } catch (err: any) { setFormError(err.message); }
  };

  const handleEdit = (appt: any) => {
    setFormData({
      paciente_id: appt.paciente_id,
      date: appt.data,
      time: appt.hora,
      value: appt.valor?.toString() || '',
      notes: '',
    });
    setEditingAppt(appt);
    setFormError('');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      await deletarConsulta(id);
      carregarDados();
    }
  };

  const handleStatusChange = async (appt: any, status: string) => {
    await salvarConsulta({ ...appt, data: appt.data, hora: appt.hora, status });
    carregarDados();
  };

  const getAppointmentsForDay = (date: string) =>
    consultas.filter(c => c.data === date).sort((a, b) => a.hora.localeCompare(b.hora));

  const getStatusBadge = (status: string) => {
    if (status === 'agendada') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (status === 'concluida') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const navigate = (dir: 'prev' | 'next') => {
    const d = parseISO(selectedDate);
    const fn = { day: [subDays, addDays], week: [subWeeks, addWeeks], month: [subMonths, addMonths] }[viewMode];
    setSelectedDate(format((dir === 'prev' ? fn[0] : fn[1])(d, 1), 'yyyy-MM-dd'));
  };

  const getNavTitle = () => {
    const d = parseISO(selectedDate);
    if (viewMode === 'day') return format(d, "dd 'de' MMMM, EEEE", { locale: ptBR });
    if (viewMode === 'week') {
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const we = endOfWeek(d, { weekStartsOn: 0 });
      return ws.getMonth() === we.getMonth()
        ? `${format(ws, 'dd')} - ${format(we, "dd 'de' MMMM yyyy", { locale: ptBR })}`
        : `${format(ws, 'dd MMM', { locale: ptBR })} - ${format(we, 'dd MMM yyyy', { locale: ptBR })}`;
    }
    return format(d, 'MMMM yyyy', { locale: ptBR });
  };

  const weekDays = useMemo(() => {
    const ws = startOfWeek(parseISO(selectedDate), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const d = parseISO(selectedDate);
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(d), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(d), { weekStartsOn: 0 }),
    });
  }, [selectedDate]);

  const AppointmentCard = ({ appt, compact = false }: { appt: any; compact?: boolean }) => {
    const nomePaciente = appt.pacientes?.nome || pacientes.find(p => p.id === appt.paciente_id)?.nome || '—';
    if (compact) {
      return (
        <div
          className={`text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:ring-1 hover:ring-purple-400/40 ${appt.status === 'concluida' ? 'bg-emerald-500/15 text-emerald-400'
              : appt.status === 'cancelada' ? 'bg-red-500/15 text-red-400 line-through'
                : 'bg-purple-500/15 text-purple-300'}`}
          onClick={() => handleEdit(appt)}
        >
          <span className="font-medium">{appt.hora}</span> {nomePaciente}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-all border border-white/5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/20 flex flex-col items-center justify-center shrink-0">
          <Clock className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
          <span className="text-[10px] text-cyan-400 font-bold">{appt.hora}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{nomePaciente}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            R$ {Number(appt.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border hidden sm:inline-block ${getStatusBadge(appt.status)}`}>
          {appt.status}
        </span>
        <div className="flex items-center gap-0.5">
          {appt.status === 'agendada' && (<>
            <button onClick={() => handleStatusChange(appt, 'concluida')} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer" title="Concluir"><Check className="w-4 h-4" /></button>
            <button onClick={() => handleStatusChange(appt, 'cancelada')} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer" title="Cancelar"><X className="w-4 h-4" /></button>
          </>)}
          <button onClick={() => handleEdit(appt)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(appt.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const DayView = () => {
    const dayAppts = getAppointmentsForDay(selectedDate);
    const blockInfo = isDayBlocked(selectedDate);
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const isSelectedToday = selectedDate === format(now, 'yyyy-MM-dd');
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-white/5">
          <CalendarDays className="w-5 h-5 text-purple-400" />
          <h2 className="text-base font-semibold text-white capitalize">
            {format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          {blockInfo.blocked
            ? <span className="ml-auto flex items-center gap-1.5 text-sm text-red-400"><Ban className="w-4 h-4" />{blockInfo.reason}</span>
            : <span className="ml-auto text-sm text-gray-500">{dayAppts.length} consulta(s)</span>}
        </div>
        {blockInfo.blocked ? (
          <div className="p-16 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Ban className="w-10 h-10 text-red-400/60" />
            </div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Dia não disponível</h3>
            <p className="text-gray-500 text-sm">{blockInfo.reason === 'Sábado' || blockInfo.reason === 'Domingo' ? 'A clínica não funciona aos finais de semana.' : `Feriado: ${blockInfo.reason}`}</p>
            <button onClick={() => setSelectedDate(getNextWorkingDay(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd')))}
              className="mt-4 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 text-purple-300 rounded-xl text-sm cursor-pointer">
              Ir para próximo dia útil →
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-0">
            {timeSlots.filter((_, i) => i % 2 === 0).map(time => {
              const [h] = time.split(':').map(Number);
              const slotMinutes = h * 60;
              const isPast = isSelectedToday && slotMinutes < currentTimeMinutes;
              const slotAppts = dayAppts.filter(a => parseInt(a.hora) === h);
              return (
                <div key={time} className={`flex gap-4 min-h-[72px] group ${isPast ? 'opacity-40' : ''}`}>
                  <div className="w-16 text-right shrink-0 pt-1">
                    <span className="text-sm text-gray-500 font-mono">{time}</span>
                  </div>
                  <div className="flex-1 border-t border-white/5 pt-1">
                    {slotAppts.length > 0 ? (
                      <div className="space-y-1">{slotAppts.map(a => <AppointmentCard key={a.id} appt={a} />)}</div>
                    ) : !isPast && (
                      <button onClick={() => openNewForm(selectedDate)}
                        className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-transparent group-hover:border-purple-500/20 transition-colors cursor-pointer flex items-center justify-center">
                        <Plus className="w-4 h-4 text-transparent group-hover:text-purple-400/50 transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const WeekView = () => (
    <div className="space-y-4">
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isSelected = dateStr === selectedDate;
            const isToday = isTodayFn(day);
            const dayAppts = getAppointmentsForDay(dateStr);
            const blockInfo = isDayBlocked(dateStr);
            return (
              <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center py-3 px-1 rounded-xl transition-all cursor-pointer ${blockInfo.blocked ? isSelected ? 'bg-red-500/10 border border-red-500/20 opacity-70' : 'opacity-40 border border-transparent'
                    : isSelected ? 'bg-gradient-to-b from-purple-600/30 to-cyan-600/30 border border-purple-500/30'
                      : isToday ? 'bg-white/5 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
                <span className={`text-xs uppercase ${blockInfo.blocked ? 'text-red-400/60' : 'text-gray-500'}`}>
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={`text-lg font-bold mt-1 ${blockInfo.blocked ? 'text-red-400/50' : isSelected ? 'text-white' : isToday ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {format(day, 'd')}
                </span>
                {blockInfo.blocked ? <Ban className="w-3 h-3 text-red-400/40 mt-1" />
                  : dayAppts.length > 0 ? (
                    <div className="flex gap-0.5 mt-1">
                      {dayAppts.slice(0, 4).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400" />)}
                      {dayAppts.length > 4 && <span className="text-[8px] text-purple-400">+</span>}
                    </div>
                  ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {weekDays.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayAppts = getAppointmentsForDay(dateStr);
          const isToday = isTodayFn(day);
          const isSelected = dateStr === selectedDate;
          const blockInfo = isDayBlocked(dateStr);
          return (
            <div key={dateStr} onClick={() => setSelectedDate(dateStr)}
              className={`bg-white/5 backdrop-blur-sm border rounded-xl p-4 cursor-pointer transition-all ${blockInfo.blocked ? 'border-red-500/10 opacity-50' : isSelected ? 'border-purple-500/30 ring-1 ring-purple-500/20' : isToday ? 'border-cyan-500/20' : 'border-white/5 hover:border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold capitalize ${blockInfo.blocked ? 'text-red-400/60' : isToday ? 'text-cyan-400' : 'text-gray-300'}`}>
                    {format(day, 'EEEE', { locale: ptBR })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${blockInfo.blocked ? 'bg-red-500/10 text-red-400/60' : isToday ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'}`}>
                    {format(day, 'dd/MM')}
                  </span>
                </div>
                {blockInfo.blocked ? (
                  <div className="flex items-center gap-1 text-xs text-red-400/60"><Ban className="w-3 h-3" />{blockInfo.reason}</div>
                ) : dayAppts.length > 0 ? (
                  <span className="text-xs text-gray-500">{dayAppts.length} consulta(s)</span>
                ) : null}
              </div>
              {blockInfo.blocked ? (
                <div className="flex items-center justify-center py-3 gap-2 text-red-400/40"><Ban className="w-4 h-4" /><p className="text-xs">Não funciona</p></div>
              ) : dayAppts.length === 0 ? (
                <p className="text-xs text-gray-600 py-2 text-center">Sem consultas</p>
              ) : (
                <div className="space-y-1">{dayAppts.map(a => <AppointmentCard key={a.id} appt={a} compact />)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const MonthView = () => {
    const currentMonth = parseISO(selectedDate);
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 border-b border-white/5">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((label, idx) => (
            <div key={label} className={`py-3 text-center text-xs font-medium uppercase ${idx === 0 || idx === 6 ? 'text-red-400/50' : 'text-gray-500'}`}>{label}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {monthDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isTodayFn(day);
            const isSelected = dateStr === selectedDate;
            const dayAppts = getAppointmentsForDay(dateStr);
            const isPastDay = isBefore(day, new Date()) && !isToday;
            const blockInfo = isDayBlocked(dateStr);
            return (
              <button key={idx} onClick={() => { setSelectedDate(dateStr); if (!blockInfo.blocked && dayAppts.length > 0) setViewMode('day'); }}
                className={`min-h-[100px] p-2 border-b border-r border-white/5 transition-all cursor-pointer text-left ${!isCurrentMonth ? 'opacity-20' : blockInfo.blocked ? 'bg-red-500/[0.02]'
                    : isSelected ? 'bg-purple-500/10' : isToday ? 'bg-cyan-500/5' : isPastDay ? 'opacity-50' : 'hover:bg-white/5'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs'
                      : blockInfo.blocked ? 'text-red-400/40' : isSelected ? 'text-purple-400' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {!blockInfo.blocked && dayAppts.length > 0 && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">{dayAppts.length}</span>
                  )}
                </div>
                {blockInfo.blocked && isCurrentMonth ? (
                  <div className="flex items-center gap-1 text-[8px] text-red-400/70"><Ban className="w-2 h-2" /><span className="truncate">{blockInfo.reason}</span></div>
                ) : (
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map(a => (
                      <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${a.status === 'concluida' ? 'bg-emerald-500/15 text-emerald-400'
                          : a.status === 'cancelada' ? 'bg-red-500/15 text-red-400'
                            : 'bg-purple-500/15 text-purple-300'}`}>
                        <span className="font-medium">{a.hora}</span>{' '}
                        <span className="hidden sm:inline">{(a.pacientes?.nome || '').split(' ')[0]}</span>
                      </div>
                    ))}
                    {dayAppts.length > 3 && <p className="text-[9px] text-gray-500 pl-1">+{dayAppts.length - 3} mais</p>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const availableSlots = getAvailableTimeSlots(formData.date);
  const formDateBlockInfo = isDayBlocked(formData.date);

  if (loading) return <div className="text-center py-12 text-gray-500">Carregando...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda</h1>
          <p className="text-gray-400 mt-1 text-sm">Gerencie as consultas da clínica</p>
        </div>
        <button onClick={() => openNewForm()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 cursor-pointer text-sm">
          <Plus className="w-4 h-4" /> Nova Consulta
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center bg-white/5 rounded-xl p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => {
              const icons = { day: Calendar, week: Columns3, month: LayoutGrid };
              const labels = { day: 'Dia', week: 'Semana', month: 'Mês' };
              const Icon = icons[mode];
              return (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${viewMode === mode ? 'bg-gradient-to-r from-purple-600/50 to-cyan-600/50 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Icon className="w-4 h-4" /> {labels[mode]}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('prev')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
              className="px-4 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg transition-all cursor-pointer">Hoje</button>
            <h3 className="text-sm font-medium text-gray-300 min-w-[200px] text-center capitalize">{getNavTitle()}</h3>
            <button onClick={() => navigate('next')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>

      {viewMode === 'day' && <DayView />}
      {viewMode === 'week' && <WeekView />}
      {viewMode === 'month' && <MonthView />}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-[#1a1035] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">{editingAppt ? 'Editar Consulta' : 'Nova Consulta'}</h3>
            {formError && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />{formError}
              </div>
            )}
            {formDateBlockInfo.blocked && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <Ban className="w-4 h-4 shrink-0" />
                <div><p className="font-medium">Dia indisponível: {formDateBlockInfo.reason}</p></div>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Paciente *</label>
                <select value={formData.paciente_id} onChange={e => setFormData(f => ({ ...f, paciente_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" required>
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.id} className="bg-[#1a1035]">{p.nome}</option>)}
                </select>
                {pacientes.length === 0 && <p className="text-xs text-amber-400 mt-1">⚠ Cadastre pacientes primeiro</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data *</label>
                <input type="date" value={formData.date} min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => {
                    const nd = e.target.value;
                    const bi = isDayBlocked(nd);
                    setFormError(bi.blocked ? `${bi.reason} — A clínica não funciona neste dia.` : '');
                    const slots = getAvailableTimeSlots(nd);
                    const first = slots.find(s => !s.isPast);
                    setFormData(f => ({ ...f, date: nd, time: first?.time || f.time }));
                  }}
                  className={`w-full px-4 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all [color-scheme:dark] ${formDateBlockInfo.blocked ? 'border-red-500/30 focus:ring-red-500/50' : 'border-white/10 focus:ring-purple-500/50'}`} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Horário *</label>
                  <select value={formData.time} onChange={e => setFormData(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" required disabled={formDateBlockInfo.blocked}>
                    {availableSlots.map(s => (
                      <option key={s.time} value={s.time} className="bg-[#1a1035]" disabled={s.isPast && !editingAppt}>
                        {s.time}{s.isPast && !editingAppt ? ' (indisponível)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" min="0" value={formData.value}
                    onChange={e => setFormData(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    placeholder="150.00" required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer text-sm">Cancelar</button>
                <button type="submit" disabled={formDateBlockInfo.blocked || (!editingAppt && isTimeInPast(formData.date, formData.time))}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-xl shadow-lg cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                  {editingAppt ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}