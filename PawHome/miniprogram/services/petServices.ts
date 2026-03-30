import { request } from "./request"

export type PetServiceProvider = {
  id: string
  serviceType: string
  name: string
  description: string
  distance: string
  rating: string
  hours: string
  address: string
  coverImage: string
  status: string
}

export type PetServiceOffering = {
  id: string
  providerId: string
  serviceType: string
  name: string
  summary: string
  descList: string[]
  price: number
  durationMinutes: number
  availableDates: string[]
  status: string
}

export type PetServiceSlot = {
  id: string
  providerId: string
  offeringId: string
  serviceType: string
  serviceDate: string
  timeLabel: string
  appointmentAt: string
  capacity: number
  reservedCount: number
  remaining: number
  status: string
}

export type PetServiceAppointment = {
  id: string
  petId: string
  providerId?: string
  offeringId?: string
  slotId?: string
  serviceType: string
  serviceDate: string
  timeLabel: string
  appointmentAt: string
  price?: number
  notes: string
  status: string
  provider?: { id: string; name: string }
  offering?: { id: string; name: string; price: number }
  slot?: { id: string; serviceDate: string; timeLabel: string; appointmentAt: string }
}

export function getServiceProviders(serviceType: string): Promise<{ list: PetServiceProvider[]; total: number }> {
  return request({
    url: "/services/providers",
    method: "GET",
    data: { serviceType }
  })
}

export function getServiceOfferings(params: {
  serviceType: string
  providerId: string
}): Promise<{ list: PetServiceOffering[]; total: number }> {
  return request({
    url: "/services/offerings",
    method: "GET",
    data: params
  })
}

export function getServiceSlots(params: {
  offeringId: string
  date: string
}): Promise<{ list: PetServiceSlot[]; total: number }> {
  return request({
    url: "/services/slots",
    method: "GET",
    data: params
  })
}

export function createServiceAppointment(data: {
  serviceType: string
  petId: string
  providerId: string
  offeringId: string
  slotId: string
  appointmentAt: string
  notes?: string
}): Promise<PetServiceAppointment> {
  return request({
    url: "/services/appointments",
    method: "POST",
    data
  })
}

export function listServiceAppointments(params?: {
  page?: number
  pageSize?: number
  status?: string
  serviceType?: string
}): Promise<{ list: PetServiceAppointment[]; total: number; page: number; pageSize: number }> {
  return request({
    url: "/services/appointments",
    method: "GET",
    data: params || {}
  })
}
