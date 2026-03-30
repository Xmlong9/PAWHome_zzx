import { request } from "./request"

export type VaccineCatalogItem = {
  id: string
  category: "core" | "optional"
  name: string
  description: string
}

export type VaccineStatusItem = VaccineCatalogItem & {
  vaccinated: boolean
  lastVaccinatedAt: string | null
  providerName: string
}

export type DewormingRecordItem = {
  id: string
  petId: string
  recordAt: string
  title: string
  providerName: string
  notes: string
}

export type VaccineReminderItem = {
  id: string
  petId: string
  appointmentId: string
  vaccineId: string
  vaccineName: string
  appointmentAt: string
  remindAt: string
  aheadDays: number
  channel: "push" | "sms"
  remark: string
  addToCalendar: boolean
  status: string
}

export function getVaccineCatalog(category: "core" | "optional"): Promise<{ list: VaccineCatalogItem[]; total: number }> {
  return request({
    url: "/vaccines/catalog",
    method: "GET",
    data: { category }
  })
}

export function getVaccineStatus(params: {
  petId: string
  category: "core" | "optional"
}): Promise<{ list: VaccineStatusItem[]; total: number }> {
  return request({
    url: "/vaccines/status",
    method: "GET",
    data: params
  })
}

export function getDewormingRecords(petId: string): Promise<{ list: DewormingRecordItem[]; total: number }> {
  return request({
    url: "/deworming/records",
    method: "GET",
    data: { petId }
  })
}

export function getUpcomingVaccineReminder(petId: string): Promise<{ reminder: VaccineReminderItem | null }> {
  return request({
    url: "/vaccines/reminders/upcoming",
    method: "GET",
    data: { petId }
  })
}

export function getReminderByAppointment(appointmentId: string): Promise<{
  exists: boolean
  reminder?: VaccineReminderItem
}> {
  return request({
    url: "/vaccines/reminders/by-appointment",
    method: "GET",
    data: { appointmentId }
  })
}

export function upsertVaccineReminder(data: {
  appointmentId: string
  aheadDays: number
  channel: "push" | "sms"
  remark?: string
  addToCalendar?: boolean
}): Promise<VaccineReminderItem> {
  return request({
    url: "/vaccines/reminders",
    method: "POST",
    data
  })
}
