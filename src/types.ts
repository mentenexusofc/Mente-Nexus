export interface Patient {
  id: string;
  name: string;
  birthDate: string;
  cpf: string;
  phone: string;
  email: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  value: number;
  status: 'agendada' | 'concluída' | 'cancelada';
  notes: string;
}

export interface User {
  username: string;
  name: string;
}
