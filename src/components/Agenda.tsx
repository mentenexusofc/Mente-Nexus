import { useState, useMemo } from 'react';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, Trash2,
  Check, X, Edit3, AlertTriangle, Calendar, Columns3, LayoutGrid, Ban
} from 'lucide-react';
import { getAppointments, getPatients, saveAppointment, deleteAppointment } from '../store';
import { Appointment } from '../types';
import {
  format, addDays, subDays, parseISO, startOfWeek, endOfWeek,
  addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths,
  isSameMonth, eachDayOfInterval, isToday as isTodayFn, isBefore,
  getDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

type ViewMode = 'day' | 'week' | 'month';

// ========== FERIADOS NACIONAIS BRASILEIROS ==========
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getBrazilianHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();

  // Feriados fixos
  holidays.set(`${year}-01-01`, 'Confraternização Universal');
  holidays.set(`${year}-04-21`, 'Tiradentes');
  holidays.set(`${year}-05-01`, 'Dia do Trabalho');
  holidays.set(`${year}-09-07`, 'Independência do Brasil');
  holidays.set(`${year}-10-12`, 'Nossa Sra. Aparecida');
  holidays.set(`${year}-11-02`, 'Finados');
  holidays.set(`${year}-11-15`, 'Proclamação da República');
  holidays.set(`${year}-12-25`, 'Natal');

  // Feriados móveis (baseados na Páscoa)
  const easter = getEaster(year);
  const easterTime = easter.getTime();

  const carnival = new Date(easterTime - 47 * 86400000); // 47 dias antes da Páscoa
  const goodFriday = new Date(easterTime - 2 * 86400000); // Sexta-feira Santa
  const corpusChristi = new Date(easterTime + 60 * 86400000); // Corpus Christi

  holidays.set(format(carnival, 'yyyy-MM-dd'), 'Carnaval');
  holidays.set(format(new Date(easterTime - 46 * 86400000), 'yyyy-MM-dd'), 'Carnaval');
  holidays.set(format(goodFriday, 'yyyy-MM-dd'), 'Sexta-feira Santa');
  holidays.set(format(easter, 'yyyy-MM-dd'), 'Páscoa');
  holidays.set(format(corpusChristi, 'yyyy-MM-dd'), 'Corpus Christi');

  return holidays;
}

function isHoliday(dateStr: string): string | null {
  const year = parseInt(dateStr.substring(0, 4));
  const holidays = getBrazilianHolidays(year);
  return holidays.get(dateStr) || null;
}

function isWeekend(dateStr: string): boolean {
  const d = parseISO(dateStr);
  const day = getDay(d); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

function isDayBlocked(dateStr: string): { blocked: boolean; reason: string } {
  if (isWeekend(dateStr)) {
    const d = parseISO(dateStr);
    const day = getDay(d);
    return { blocked: true, reason: day === 0 ? 'Domingo' : 'Sábado' };
  }
  const holiday = isHoliday(dateStr);
  if (holiday) {
    return { blocked: true, reason: holiday };
  }
  return { blocked: false, reason: '' };
}

// =====================================================

export default function Agenda() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formError, setFormError] = useState('');

  const patients = getPatients();
  const allAppointments = getAppointments();

  const timeSlots = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00'
  ];

  const [formData, setFormData] = useState({
    patientId: '',
    date: selectedDate,
    time: '09:00',
    value: '',
    notes: '',
  });

  // Check if a time slot is in the past
  const isTimeInPast = (date: string, time: string): boolean => {
    const now = new Date();
    const slotDate = parseISO(date);

    if (format(slotDate, 'yyyy-MM-dd') < format(now, 'yyyy-MM-dd')) {
      return true;
    }

    if (format(slotDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      const [slotHours, slotMinutes] = time.split(':').map(Number);
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();

      if (slotHours < currentHours) return true;
      if (slotHours === currentHours && slotMinutes <= currentMinutes) return true;
    }

    return false;
  };

  // Get available time slots for a given date (filter out past times)
  const getAvailableTimeSlots = (date: string) => {
    return timeSlots.map(t => ({
      time: t,
      isPast: isTimeInPast(date, t),
    }));
  };

  // Find next available working day (skip weekends and holidays)
  const getNextWorkingDay = (fromDate: string): string => {
    let d = parseISO(fromDate);
    let attempts = 0;
    while (attempts < 365) {
      const dateStr = format(d, 'yyyy-MM-dd');
      if (!isDayBlocked(dateStr).blocked) {
        return dateStr;
      }
      d = addDays(d, 1);
      attempts++;
    }
    return fromDate;
  };

  const resetForm = () => {
    setFormData({ patientId: '', date: selectedDate, time: '09:00', value: '', notes: '' });
    setEditingAppointment(null);
    setShowForm(false);
    setFormError('');
  };

  const openNewForm = (date?: string) => {
    let targetDate = date || selectedDate;

    // If the target date is blocked, find the next working day
    const blockInfo = isDayBlocked(targetDate);
    if (blockInfo.blocked) {
      targetDate = getNextWorkingDay(targetDate);
    }

    const availableSlots = getAvailableTimeSlots(targetDate);
    const firstAvailable = availableSlots.find(s => !s.isPast);

    setFormData({
      patientId: '',
      date: targetDate,
      time: firstAvailable?.time || '09:00',
      value: '',
      notes: '',
    });
    setEditingAppointment(null);
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validate not on blocked day
    const blockInfo = isDayBlocked(formData.date);
    if (blockInfo.blocked) {
      setFormError(`Não é possível agendar neste dia: ${blockInfo.reason}. A clínica não funciona em sábados, domingos e feriados.`);
      return;
    }

    // Validate time is not in the past
    if (!editingAppointment && isTimeInPast(formData.date, formData.time)) {
      setFormError('Não é possível agendar em um horário que já passou!');
      return;
    }

    const patient = patients.find(p => p.id === formData.patientId);
    if (!patient) {
      setFormError('Selecione um paciente!');
      return;
    }

    const appointment: Appointment = {
      id: editingAppointment?.id || crypto.randomUUID(),
      patientId: formData.patientId,
      patientName: patient.name,
      date: formData.date,
      time: formData.time,
      value: parseFloat(formData.value) || 0,
      status: editingAppointment?.status || 'agendada',
      notes: formData.notes,
    };

    saveAppointment(appointment);
    resetForm();
    setRefreshKey(k => k + 1);
  };

  const handleEdit = (appt: Appointment) => {
    setFormData({
      patientId: appt.patientId,
      date: appt.date,
      time: appt.time,
      value: appt.value.toString(),
      notes: appt.notes,
    });
    setEditingAppointment(appt);
    setFormError('');
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta consulta?')) {
      deleteAppointment(id);
      setRefreshKey(k => k + 1);
    }
  };

  const handleStatusChange = (appt: Appointment, status: Appointment['status']) => {
    saveAppointment({ ...appt, status });
    setRefreshKey(k => k + 1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'concluída': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelada': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getAppointmentsForDay = (date: string) => {
    return allAppointments.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
  };

  // Navigation
  const navigate = (direction: 'prev' | 'next') => {
    const current = parseISO(selectedDate);
    let newDate: Date;
    switch (viewMode) {
      case 'day':
        newDate = direction === 'prev' ? subDays(current, 1) : addDays(current, 1);
        break;
      case 'week':
        newDate = direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1);
        break;
      case 'month':
        newDate = direction === 'prev' ? subMonths(current, 1) : addMonths(current, 1);
        break;
    }
    setSelectedDate(format(newDate, 'yyyy-MM-dd'));
  };

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  // Get navigation title
  const getNavTitle = () => {
    const d = parseISO(selectedDate);
    switch (viewMode) {
      case 'day':
        return format(d, "dd 'de' MMMM, EEEE", { locale: ptBR });
      case 'week': {
        const ws = startOfWeek(d, { weekStartsOn: 0 });
        const we = endOfWeek(d, { weekStartsOn: 0 });
        if (ws.getMonth() === we.getMonth()) {
          return `${format(ws, 'dd')} - ${format(we, "dd 'de' MMMM yyyy", { locale: ptBR })}`;
        }
        return `${format(ws, "dd MMM", { locale: ptBR })} - ${format(we, "dd MMM yyyy", { locale: ptBR })}`;
      }
      case 'month':
        return format(d, 'MMMM yyyy', { locale: ptBR });
    }
  };

  // Week days for week view (Sunday = 0 to Saturday = 6)
  const weekDays = useMemo(() => {
    const ws = startOfWeek(parseISO(selectedDate), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [selectedDate]);

  // Month days for month view (starts on Sunday)
  const monthDays = useMemo(() => {
    const d = parseISO(selectedDate);
    const ms = startOfMonth(d);
    const me = endOfMonth(d);
    const calendarStart = startOfWeek(ms, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(me, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedDate]);

  // Blocked day badge
  const BlockedBadge = ({ reason, small = false }: { reason: string; small?: boolean }) => (
    <div className={`flex items-center gap-1 ${small ? 'text-[8px]' : 'text-[10px]'} text-red-400/70`}>
      <Ban className={small ? 'w-2 h-2' : 'w-3 h-3'} />
      <span className="truncate">{reason}</span>
    </div>
  );

  // Appointment card component
  const AppointmentCard = ({ appt, compact = false }: { appt: Appointment; compact?: boolean }) => {
    if (compact) {
      return (
        <div
          className={`text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-all hover:ring-1 hover:ring-purple-400/40 ${
            appt.status === 'concluída'
              ? 'bg-emerald-500/15 text-emerald-400'
              : appt.status === 'cancelada'
              ? 'bg-red-500/15 text-red-400 line-through'
              : 'bg-purple-500/15 text-purple-300'
          }`}
          onClick={() => handleEdit(appt)}
          title={`${appt.time} - ${appt.patientName}`}
        >
          <span className="font-medium">{appt.time}</span> {appt.patientName}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-white/5 hover:bg-white/[0.07] transition-all border border-white/5">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/20 flex flex-col items-center justify-center shrink-0">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 mb-0.5" />
          <span className="text-[10px] sm:text-xs text-cyan-400 font-bold">{appt.time}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{appt.patientName}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            R$ {appt.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            {appt.notes && ` • ${appt.notes}`}
          </p>
        </div>
        <span className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-medium border hidden sm:inline-block ${getStatusBadge(appt.status)}`}>
          {appt.status}
        </span>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {appt.status === 'agendada' && (
            <>
              <button
                onClick={() => handleStatusChange(appt, 'concluída')}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer"
                title="Concluir"
              >
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => handleStatusChange(appt, 'cancelada')}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => handleEdit(appt)}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
            title="Editar"
          >
            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={() => handleDelete(appt.id)}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ===== DAY VIEW =====
  const DayView = () => {
    const dayAppts = getAppointmentsForDay(selectedDate);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isSelectedToday = selectedDate === todayStr;
    const now = new Date();
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const blockInfo = isDayBlocked(selectedDate);

    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {/* Day Header */}
        <div className="flex items-center gap-2 p-4 sm:p-6 border-b border-white/5">
          <CalendarDays className="w-5 h-5 text-purple-400" />
          <h2 className="text-base sm:text-lg font-semibold text-white capitalize">
            {format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          {blockInfo.blocked ? (
            <span className="ml-auto flex items-center gap-1.5 text-sm text-red-400">
              <Ban className="w-4 h-4" />
              {blockInfo.reason}
            </span>
          ) : (
            <span className="ml-auto text-sm text-gray-500">{dayAppts.length} consulta(s)</span>
          )}
        </div>

        {/* Blocked Day Message */}
        {blockInfo.blocked ? (
          <div className="p-8 sm:p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
              <Ban className="w-10 h-10 text-red-400/60" />
            </div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">Dia não disponível</h3>
            <p className="text-gray-500 text-sm max-w-sm">
              {blockInfo.reason === 'Sábado' || blockInfo.reason === 'Domingo'
                ? 'A clínica não funciona aos finais de semana.'
                : `Feriado: ${blockInfo.reason}. A clínica não funciona em feriados.`
              }
            </p>
            <button
              onClick={() => {
                const nextWork = getNextWorkingDay(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
                setSelectedDate(nextWork);
              }}
              className="mt-4 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 text-purple-300 rounded-xl text-sm transition-all cursor-pointer"
            >
              Ir para próximo dia útil →
            </button>
          </div>
        ) : (
          /* Timeline */
          <div className="p-2 sm:p-4">
            <div className="space-y-0">
              {timeSlots.filter((_, i) => i % 2 === 0).map(time => {
                const [h, m] = time.split(':').map(Number);
                const slotMinutes = h * 60 + m;
                const isPast = isSelectedToday && slotMinutes < currentTimeMinutes;
                const slotAppts = dayAppts.filter(a => {
                  const [ah] = a.time.split(':').map(Number);
                  return ah === h;
                });

                return (
                  <div key={time} className={`flex gap-2 sm:gap-4 min-h-[60px] sm:min-h-[72px] group ${isPast ? 'opacity-40' : ''}`}>
                    {/* Time label */}
                    <div className="w-12 sm:w-16 text-right shrink-0 pt-1">
                      <span className="text-xs sm:text-sm text-gray-500 font-mono">{time}</span>
                    </div>
                    {/* Slot content */}
                    <div className="flex-1 border-t border-white/5 pt-1 relative">
                      {isSelectedToday && !isPast && slotMinutes <= currentTimeMinutes + 60 && slotMinutes > currentTimeMinutes && (
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-cyan-500 z-10"
                          style={{
                            top: `${((currentTimeMinutes - slotMinutes + 60) / 60) * 100}%`,
                          }}
                        >
                          <div className="w-2 h-2 rounded-full bg-cyan-500 -mt-[3px] -ml-1" />
                        </div>
                      )}
                      {slotAppts.length > 0 ? (
                        <div className="space-y-1">
                          {slotAppts.map(appt => (
                            <AppointmentCard key={appt.id} appt={appt} />
                          ))}
                        </div>
                      ) : (
                        !isPast && (
                          <button
                            onClick={() => openNewForm(selectedDate)}
                            className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-transparent group-hover:border-purple-500/20 transition-colors cursor-pointer flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4 text-transparent group-hover:text-purple-400/50 transition-colors" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ===== WEEK VIEW =====
  const WeekView = () => {
    return (
      <div className="space-y-4">
        {/* Week Calendar Strip */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isSelected = dateStr === selectedDate;
              const isToday = isTodayFn(day);
              const dayAppts = getAppointmentsForDay(dateStr);
              const isPast = isBefore(day, new Date()) && !isToday;
              const blockInfo = isDayBlocked(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 rounded-xl transition-all cursor-pointer ${
                    blockInfo.blocked
                      ? isSelected
                        ? 'bg-red-500/10 border border-red-500/20 opacity-70'
                        : 'opacity-40 border border-transparent hover:opacity-60'
                      : isSelected
                      ? 'bg-gradient-to-b from-purple-600/30 to-cyan-600/30 border border-purple-500/30 shadow-lg shadow-purple-500/10'
                      : isToday
                      ? 'bg-white/5 border border-cyan-500/20'
                      : isPast
                      ? 'opacity-50 hover:opacity-75 border border-transparent'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={`text-[10px] sm:text-xs uppercase ${
                    blockInfo.blocked ? 'text-red-400/60' : 'text-gray-500'
                  }`}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className={`text-base sm:text-lg font-bold mt-0.5 sm:mt-1 ${
                    blockInfo.blocked
                      ? 'text-red-400/50'
                      : isSelected
                      ? 'text-white'
                      : isToday
                      ? 'text-cyan-400'
                      : 'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {blockInfo.blocked ? (
                    <Ban className="w-3 h-3 text-red-400/40 mt-1" />
                  ) : dayAppts.length > 0 ? (
                    <div className="flex gap-0.5 mt-1">
                      {dayAppts.slice(0, 4).map((_, i) => (
                        <div key={i} className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-purple-400" />
                      ))}
                      {dayAppts.length > 4 && (
                        <span className="text-[8px] text-purple-400 ml-0.5">+</span>
                      )}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Week Grid - shows all days with their appointments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {weekDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayAppts = getAppointmentsForDay(dateStr);
            const isToday = isTodayFn(day);
            const isSelected = dateStr === selectedDate;
            const blockInfo = isDayBlocked(dateStr);

            return (
              <div
                key={dateStr}
                className={`bg-white/5 backdrop-blur-sm border rounded-xl p-3 sm:p-4 transition-all cursor-pointer ${
                  blockInfo.blocked
                    ? 'border-red-500/10 opacity-50 hover:opacity-70'
                    : isSelected
                    ? 'border-purple-500/30 ring-1 ring-purple-500/20'
                    : isToday
                    ? 'border-cyan-500/20'
                    : 'border-white/5 hover:border-white/10'
                }`}
                onClick={() => setSelectedDate(dateStr)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold capitalize ${
                      blockInfo.blocked
                        ? 'text-red-400/60'
                        : isToday
                        ? 'text-cyan-400'
                        : 'text-gray-300'
                    }`}>
                      {format(day, 'EEEE', { locale: ptBR })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      blockInfo.blocked
                        ? 'bg-red-500/10 text-red-400/60'
                        : isToday
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-white/5 text-gray-500'
                    }`}>
                      {format(day, 'dd/MM')}
                    </span>
                  </div>
                  {blockInfo.blocked ? (
                    <div className="flex items-center gap-1 text-xs text-red-400/60">
                      <Ban className="w-3 h-3" />
                      {blockInfo.reason}
                    </div>
                  ) : dayAppts.length > 0 ? (
                    <span className="text-xs text-gray-500">{dayAppts.length} consulta(s)</span>
                  ) : null}
                </div>

                {blockInfo.blocked ? (
                  <div className="flex items-center justify-center py-3 gap-2 text-red-400/40">
                    <Ban className="w-4 h-4" />
                    <p className="text-xs">Não funciona</p>
                  </div>
                ) : dayAppts.length === 0 ? (
                  <p className="text-xs text-gray-600 py-2 text-center">Sem consultas</p>
                ) : (
                  <div className="space-y-1">
                    {dayAppts.map(appt => (
                      <AppointmentCard key={appt.id} appt={appt} compact />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ===== MONTH VIEW =====
  const MonthView = () => {
    const currentMonth = parseISO(selectedDate);
    // Domingo a Sábado
    const weekDayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {weekDayLabels.map((label, idx) => {
            const isWeekendLabel = idx === 0 || idx === 6;
            return (
              <div
                key={label}
                className={`py-2 sm:py-3 text-center text-[10px] sm:text-xs font-medium uppercase ${
                  isWeekendLabel ? 'text-red-400/50' : 'text-gray-500'
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Calendar grid */}
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
              <button
                key={idx}
                onClick={() => {
                  setSelectedDate(dateStr);
                  if (!blockInfo.blocked && dayAppts.length > 0) {
                    setViewMode('day');
                  }
                }}
                className={`min-h-[70px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-white/5 transition-all cursor-pointer text-left ${
                  !isCurrentMonth
                    ? 'opacity-20'
                    : blockInfo.blocked
                    ? isSelected
                      ? 'bg-red-500/5'
                      : 'bg-red-500/[0.02]'
                    : isSelected
                    ? 'bg-purple-500/10'
                    : isToday
                    ? 'bg-cyan-500/5'
                    : isPastDay
                    ? 'opacity-50'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs sm:text-sm font-medium ${
                    isToday
                      ? 'bg-cyan-500 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs'
                      : blockInfo.blocked
                      ? 'text-red-400/40'
                      : isSelected
                      ? 'text-purple-400'
                      : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {!blockInfo.blocked && dayAppts.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] bg-purple-500/20 text-purple-300 px-1 sm:px-1.5 py-0.5 rounded-full font-medium">
                      {dayAppts.length}
                    </span>
                  )}
                </div>

                {blockInfo.blocked && isCurrentMonth ? (
                  <BlockedBadge reason={blockInfo.reason} small />
                ) : (
                  /* Compact appointment list */
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map(appt => (
                      <div
                        key={appt.id}
                        className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded truncate ${
                          appt.status === 'concluída'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : appt.status === 'cancelada'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-purple-500/15 text-purple-300'
                        }`}
                      >
                        <span className="font-medium">{appt.time}</span>{' '}
                        <span className="hidden sm:inline">{appt.patientName.split(' ')[0]}</span>
                      </div>
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-[9px] text-gray-500 pl-1">+{dayAppts.length - 3} mais</p>
                    )}
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

  return (
    <div className="space-y-4 sm:space-y-6" key={refreshKey}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Agenda</h1>
          <p className="text-gray-400 mt-1 text-sm">Gerencie as consultas da clínica</p>
        </div>
        <button
          onClick={() => openNewForm()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25 cursor-pointer text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Consulta
        </button>
      </div>

      {/* View Controls & Navigation */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white/5 rounded-xl p-1 self-center sm:self-auto">
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-gradient-to-r from-purple-600/50 to-cyan-600/50 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-purple-600/50 to-cyan-600/50 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Semana
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-purple-600/50 to-cyan-600/50 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Mês
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('prev')}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              onClick={goToToday}
              className="px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              Hoje
            </button>

            <h3 className="text-xs sm:text-sm font-medium text-gray-300 min-w-[140px] sm:min-w-[200px] text-center capitalize">
              {getNavTitle()}
            </h3>

            <button
              onClick={() => navigate('next')}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'day' && <DayView />}
      {viewMode === 'week' && <WeekView />}
      {viewMode === 'month' && <MonthView />}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="bg-[#1a1035] border border-white/10 rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingAppointment ? 'Editar Consulta' : 'Nova Consulta'}
            </h3>

            {/* Error message */}
            {formError && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* Blocked day warning */}
            {formDateBlockInfo.blocked && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                <Ban className="w-4 h-4 shrink-0" />
                <div>
                  <p className="font-medium">Dia indisponível: {formDateBlockInfo.reason}</p>
                  <p className="text-xs text-red-400/70 mt-0.5">A clínica não funciona neste dia. Escolha outro.</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Patient */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Paciente *</label>
                <select
                  value={formData.patientId}
                  onChange={e => setFormData(f => ({ ...f, patientId: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#1a1035]">{p.name}</option>
                  ))}
                </select>
                {patients.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">⚠ Cadastre pacientes primeiro na aba Pacientes</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => {
                    const newDate = e.target.value;
                    const newBlockInfo = isDayBlocked(newDate);
                    if (newBlockInfo.blocked) {
                      setFormError(`${newBlockInfo.reason} — A clínica não funciona neste dia.`);
                    } else {
                      setFormError('');
                    }
                    setFormData(f => {
                      const slots = getAvailableTimeSlots(newDate);
                      const currentTimeAvailable = slots.find(s => s.time === f.time && !s.isPast);
                      const firstAvailable = slots.find(s => !s.isPast);
                      return {
                        ...f,
                        date: newDate,
                        time: currentTimeAvailable ? f.time : (firstAvailable?.time || f.time),
                      };
                    });
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className={`w-full px-4 py-2.5 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 transition-all ${
                    formDateBlockInfo.blocked
                      ? 'border-red-500/30 focus:ring-red-500/50'
                      : 'border-white/10 focus:ring-purple-500/50'
                  }`}
                  required
                />
              </div>

              {/* Time & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Horário *</label>
                  <select
                    value={formData.time}
                    onChange={e => {
                      setFormData(f => ({ ...f, time: e.target.value }));
                      if (!formDateBlockInfo.blocked) setFormError('');
                    }}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    required
                    disabled={formDateBlockInfo.blocked}
                  >
                    {availableSlots.map(slot => (
                      <option
                        key={slot.time}
                        value={slot.time}
                        className="bg-[#1a1035]"
                        disabled={slot.isPast && !editingAppointment}
                      >
                        {slot.time}{slot.isPast && !editingAppointment ? ' (indisponível)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={e => setFormData(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="150.00"
                    required
                  />
                </div>
              </div>

              {/* Past time warning */}
              {!editingAppointment && !formDateBlockInfo.blocked && isTimeInPast(formData.date, formData.time) && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Este horário já passou. Selecione um horário futuro.
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none h-20"
                  placeholder="Observações..."
                />
              </div>

              {/* Buttons */}
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
                  disabled={formDateBlockInfo.blocked || (!editingAppointment && isTimeInPast(formData.date, formData.time))}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 cursor-pointer text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                >
                  {editingAppointment ? 'Salvar' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
