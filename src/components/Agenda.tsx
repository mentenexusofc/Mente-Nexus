import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, Trash2,
  Check, X, Edit3, AlertTriangle, Calendar, Columns3, LayoutGrid, Ban
} from 'lucide-react';
import { getPacientes } from '../db';
import {
  format, addDays, subDays, parseISO, startOfWeek, endOfWeek,
  addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths,
  isSameMonth, eachDayOfInterval, isToday as isTodayFn, isBefore, getDay
} from 'date-fns';
import { initGoogle, loginGoogle, loginGoogleSilent, getAccessToken, getEventos, criarEvento, atualizarEvento, deletarEvento } from '../googleCalendar';
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

function isDayBlocked(dateStr: string): { blocked: boolean; reason: string } {
  const day = getDay(parseISO(dateStr));
  if (day === 0) return { blocked: true, reason: 'Domingo' };
  if (day === 6) return { blocked: true, reason: 'Sábado' };
  const year = parseInt(dateStr.substring(0, 4));
  const holiday = getBrazilianHolidays(year).get(dateStr);
  if (holiday) return { blocked: true, reason: holiday };
  return { blocked: false, reason: '' };
}

const timeSlots = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00'
];

// Converte evento do Google Calendar para formato interno
function googleEventToAppt(event: any) {
  const start = event.start?.dateTime || event.start?.date;
  const date = start ? format(new Date(start), 'yyyy-MM-dd') : '';
  const hora = start && event.start?.dateTime ? format(new Date(start), 'HH:mm') : '00:00';
  return {
    id: event.id,
    titulo: event.summary || '',
    data: date,
    hora,
    descricao: event.description || '',
    status: event.description?.includes('[cancelada]') ? 'cancelada'
      : event.description?.includes('[concluida]') ? 'concluida' : 'agendada',
    raw: event,
  };
}

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState<any | null>(null);
  const [formError, setFormError] = useState('');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleLogado, setGoogleLogado] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [formData, setFormData] = useState({
    paciente_id: '', date: selectedDate, time: '09:00', duracao: '50', descricao: '',
  });

  useEffect(() => {
    initGoogle().then(async () => {
      getPacientes().then(p => setPacientes(p || []));
      // Tenta renovar o token silenciosamente
      const token = await loginGoogleSilent();
      if (token) {
        setGoogleLogado(true);
      }
      setLoading(false);
    });
  }, []);

  async function handleLoginGoogle() {
    setLoginLoading(true);
    try {
      await loginGoogle();
      setGoogleLogado(true);
      await carregarEventos();
    } catch (err) {
      console.error(err);
    }
    setLoginLoading(false);
  }

  async function carregarEventos() {
    if (!getAccessToken()) return;
    try {
      const d = parseISO(selectedDate);
      const inicio = format(startOfMonth(addMonths(d, -1)), 'yyyy-MM-dd');
      const fim = format(endOfMonth(addMonths(d, 1)), 'yyyy-MM-dd');
      const evs = await getEventos(inicio, fim);
      setEventos(evs.map(googleEventToAppt));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (googleLogado) carregarEventos();
  }, [selectedDate, googleLogado]);

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
    setFormData({ paciente_id: '', date: selectedDate, time: '09:00', duracao: '50', descricao: '' });
    setEditingAppt(null);
    setShowForm(false);
    setFormError('');
  };

  const openNewForm = (date?: string) => {
    let target = date || selectedDate;
    if (isDayBlocked(target).blocked) target = getNextWorkingDay(target);
    const slots = getAvailableTimeSlots(target);
    const first = slots.find(s => !s.isPast);
    setFormData({ paciente_id: '', date: target, time: first?.time || '09:00', duracao: '50', descricao: '' });
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

    const paciente = pacientes.find(p => p.id === formData.paciente_id);
    const titulo = paciente ? `Consulta - ${paciente.nome}` : 'Consulta';

    try {
      if (editingAppt) {
        await atualizarEvento(editingAppt.id, {
          titulo,
          data: formData.date,
          hora: formData.time,
          duracao: parseInt(formData.duracao),
          descricao: formData.descricao,
        });
      } else {
        await criarEvento({
          titulo,
          data: formData.date,
          hora: formData.time,
          duracao: parseInt(formData.duracao),
          descricao: formData.descricao,
        });
      }
      resetForm();
      carregarEventos();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleEdit = (appt: any) => {
    const paciente = pacientes.find(p => appt.titulo.includes(p.nome));
    setFormData({
      paciente_id: paciente?.id || '',
      date: appt.data,
      time: appt.hora,
      duracao: '50',
      descricao: appt.descricao,
    });
    setEditingAppt(appt);
    setFormError('');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      await deletarEvento(id);
      carregarEventos();
    }
  };

  const handleStatusChange = async (appt: any, status: string) => {
    await atualizarEvento(appt.id, {
      titulo: appt.titulo,
      data: appt.data,
      hora: appt.hora,
      duracao: 50,
      descricao: `[${status}] ${appt.descricao}`,
    });
    carregarEventos();
  };

  const getAppointmentsForDay = (date: string) =>
    eventos.filter(e => e.data === date).sort((a, b) => a.hora.localeCompare(b.hora));

  const getStatusBadge = (status: string) => {
    if (status === 'agendada') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (status === 'concluida') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  };

  const navigate = (dir: 'prev' | 'next') => {
    const d = parseISO(selectedDate);
    const fns: Record<ViewMode, [Function, Function]> = {
      day: [subDays, addDays], week: [subWeeks, addWeeks], month: [subMonths, addMonths]
    };
    const [prev, next] = fns[viewMode];
    setSelectedDate(format((dir === 'prev' ? prev : next)(d, 1), 'yyyy-MM-dd'));
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
    if (compact) {
      return (
        <div
          className={`text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer hover:ring-1 hover:ring-purple-400/40 ${appt.status === 'concluida' ? 'bg-emerald-500/15 text-emerald-400'
            : appt.status === 'cancelada' ? 'bg-red-500/15 text-red-400 line-through'
              : 'bg-purple-500/15 text-purple-300'}`}
          onClick={() => handleEdit(appt)}
        >
          <span className="font-medium">{appt.hora}</span> {appt.titulo}
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
          <p className="text-sm font-medium text-white truncate">{appt.titulo}</p>
          {appt.descricao && <p className="text-xs text-gray-500 mt-0.5 truncate">{appt.descricao}</p>}
        </div>
        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border hidden sm:inline-block ${getStatusBadge(appt.status)}`}>
          {appt.status}
        </span>
        <div className="flex items-center gap-0.5">
          {appt.status === 'agendada' && (<>
            <button onClick={() => handleStatusChange(appt, 'concluida')} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 cursor-pointer"><Check className="w-4 h-4" /></button>
            <button onClick={() => handleStatusChange(appt, 'cancelada')} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 cursor-pointer"><X className="w-4 h-4" /></button>
          </>)}
          <button onClick={() => handleEdit(appt)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white cursor-pointer"><Edit3 className="w-4 h-4" /></button>
          <button onClick={() => handleDelete(appt.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const DayView = () => {
    const dayAppts = getAppointmentsForDay(selectedDate);
    const blockInfo = isDayBlocked(selectedDate);
    const now = new Date();
    const isSelectedToday = selectedDate === format(now, 'yyyy-MM-dd');
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
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
            <Ban className="w-12 h-12 text-red-400/40 mb-4" />
            <h3 className="text-lg font-semibold text-red-400 mb-2">Dia não disponível</h3>
            <p className="text-gray-500 text-sm">{blockInfo.reason}</p>
            <button onClick={() => setSelectedDate(getNextWorkingDay(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd')))}
              className="mt-4 px-4 py-2 bg-purple-600/20 border border-purple-500/20 text-purple-300 rounded-xl text-sm cursor-pointer">
              Próximo dia útil →
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
                        className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-transparent group-hover:border-purple-500/20 cursor-pointer flex items-center justify-center">
                        <Plus className="w-4 h-4 text-transparent group-hover:text-purple-400/50" />
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
                className={`flex flex-col items-center py-3 px-1 rounded-xl cursor-pointer transition-all ${blockInfo.blocked ? 'opacity-40 border border-transparent'
                  : isSelected ? 'bg-gradient-to-b from-purple-600/30 to-cyan-600/30 border border-purple-500/30'
                    : isToday ? 'bg-white/5 border border-cyan-500/20' : 'hover:bg-white/5 border border-transparent'}`}>
                <span className={`text-xs uppercase ${blockInfo.blocked ? 'text-red-400/60' : 'text-gray-500'}`}>
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span className={`text-lg font-bold mt-1 ${blockInfo.blocked ? 'text-red-400/50' : isSelected ? 'text-white' : isToday ? 'text-cyan-400' : 'text-gray-300'}`}>
                  {format(day, 'd')}
                </span>
                {!blockInfo.blocked && dayAppts.length > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {dayAppts.slice(0, 4).map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400" />)}
                  </div>
                )}
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
              className={`bg-white/5 border rounded-xl p-4 cursor-pointer transition-all ${blockInfo.blocked ? 'border-red-500/10 opacity-50'
                : isSelected ? 'border-purple-500/30 ring-1 ring-purple-500/20'
                  : isToday ? 'border-cyan-500/20' : 'border-white/5 hover:border-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold capitalize ${blockInfo.blocked ? 'text-red-400/60' : isToday ? 'text-cyan-400' : 'text-gray-300'}`}>
                    {format(day, 'EEEE', { locale: ptBR })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isToday ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'}`}>
                    {format(day, 'dd/MM')}
                  </span>
                </div>
                {blockInfo.blocked
                  ? <div className="flex items-center gap-1 text-xs text-red-400/60"><Ban className="w-3 h-3" />{blockInfo.reason}</div>
                  : dayAppts.length > 0 && <span className="text-xs text-gray-500">{dayAppts.length} consulta(s)</span>}
              </div>
              {blockInfo.blocked
                ? <div className="flex items-center justify-center py-3 gap-2 text-red-400/40"><Ban className="w-4 h-4" /><p className="text-xs">Não funciona</p></div>
                : dayAppts.length === 0
                  ? <p className="text-xs text-gray-600 py-2 text-center">Sem consultas</p>
                  : <div className="space-y-1">{dayAppts.map(a => <AppointmentCard key={a.id} appt={a} compact />)}</div>}
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
                className={`min-h-[100px] p-2 border-b border-r border-white/5 cursor-pointer text-left transition-all ${!isCurrentMonth ? 'opacity-20' : blockInfo.blocked ? 'bg-red-500/[0.02]'
                  : isSelected ? 'bg-purple-500/10' : isToday ? 'bg-cyan-500/5' : isPastDay ? 'opacity-50' : 'hover:bg-white/5'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'bg-cyan-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs' : blockInfo.blocked ? 'text-red-400/40' : isSelected ? 'text-purple-400' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  {!blockInfo.blocked && dayAppts.length > 0 && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full">{dayAppts.length}</span>
                  )}
                </div>
                {blockInfo.blocked && isCurrentMonth
                  ? <div className="flex items-center gap-1 text-[8px] text-red-400/70"><Ban className="w-2 h-2" /><span className="truncate">{blockInfo.reason}</span></div>
                  : <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map(a => (
                      <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${a.status === 'concluida' ? 'bg-emerald-500/15 text-emerald-400' : a.status === 'cancelada' ? 'bg-red-500/15 text-red-400' : 'bg-purple-500/15 text-purple-300'}`}>
                        <span className="font-medium">{a.hora}</span> {a.titulo.split(' ').slice(-1)[0]}
                      </div>
                    ))}
                    {dayAppts.length > 3 && <p className="text-[9px] text-gray-500 pl-1">+{dayAppts.length - 3} mais</p>}
                  </div>}
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

  // Tela de login Google
  if (!googleLogado) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda</h1>
          <p className="text-gray-400 mt-1 text-sm">Gerencie as consultas da clínica</p>
        </div>
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-12 flex flex-col items-center text-center">
          <CalendarDays className="w-16 h-16 text-purple-400 mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Conectar Google Calendar</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm">
            Para ver e gerenciar sua agenda, conecte sua conta Google.
          </p>
          <button onClick={handleLoginGoogle} disabled={loginLoading}
            className="inline-flex items-center gap-3 px-6 py-3 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50 shadow-lg">
            {loginLoading ? (
              <div className="w-5 h-5 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Agenda</h1>
          <p className="text-gray-400 mt-1 text-sm">Google Calendar conectado</p>
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
            <button onClick={() => navigate('prev')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))} className="px-4 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg cursor-pointer">Hoje</button>
            <h3 className="text-sm font-medium text-gray-300 min-w-[200px] text-center capitalize">{getNavTitle()}</h3>
            <button onClick={() => navigate('next')} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"><ChevronRight className="w-5 h-5" /></button>
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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Paciente *</label>
                <select value={formData.paciente_id} onChange={e => setFormData(f => ({ ...f, paciente_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" required>
                  <option value="">Selecione um paciente</option>
                  {pacientes.map(p => <option key={p.id} value={p.id} className="bg-[#1a1035]">{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data *</label>
                <input type="date" value={formData.date} min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 [color-scheme:dark]" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Horário *</label>
                  <select value={formData.time} onChange={e => setFormData(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" required>
                    {availableSlots.map(s => (
                      <option key={s.time} value={s.time} className="bg-[#1a1035]" disabled={s.isPast && !editingAppt}>
                        {s.time}{s.isPast && !editingAppt ? ' (indisponível)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duração</label>
                  <select value={formData.duracao} onChange={e => setFormData(f => ({ ...f, duracao: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                    <option value="30" className="bg-[#1a1035]">30 min</option>
                    <option value="50" className="bg-[#1a1035]">50 min</option>
                    <option value="60" className="bg-[#1a1035]">1 hora</option>
                    <option value="90" className="bg-[#1a1035]">1h30</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Observações</label>
                <textarea value={formData.descricao} onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none h-20"
                  placeholder="Observações..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 py-2.5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer text-sm">Cancelar</button>
                <button type="submit" disabled={formDateBlockInfo.blocked || (!editingAppt && isTimeInPast(formData.date, formData.time))}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-xl cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed">
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