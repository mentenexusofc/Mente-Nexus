import { Patient, Appointment } from './types';

const PATIENTS_KEY = 'mentenexus_patients';
const APPOINTMENTS_KEY = 'mentenexus_appointments';

// Patients
export function getPatients(): Patient[] {
  const data = localStorage.getItem(PATIENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePatient(patient: Patient) {
  const patients = getPatients();
  const idx = patients.findIndex(p => p.id === patient.id);
  if (idx >= 0) {
    patients[idx] = patient;
  } else {
    patients.push(patient);
  }
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function deletePatient(id: string) {
  const patients = getPatients().filter(p => p.id !== id);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
  // Also delete related appointments
  const appointments = getAppointments().filter(a => a.patientId !== id);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
}

export function getPatientById(id: string): Patient | undefined {
  return getPatients().find(p => p.id === id);
}

// Appointments
export function getAppointments(): Appointment[] {
  const data = localStorage.getItem(APPOINTMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveAppointment(appointment: Appointment) {
  const appointments = getAppointments();
  const idx = appointments.findIndex(a => a.id === appointment.id);
  if (idx >= 0) {
    appointments[idx] = appointment;
  } else {
    appointments.push(appointment);
  }
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
}

export function deleteAppointment(id: string) {
  const appointments = getAppointments().filter(a => a.id !== id);
  localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
}

export function getAppointmentsByPatient(patientId: string): Appointment[] {
  return getAppointments().filter(a => a.patientId === patientId);
}

export function getAppointmentsByDate(date: string): Appointment[] {
  return getAppointments().filter(a => a.date === date);
}
