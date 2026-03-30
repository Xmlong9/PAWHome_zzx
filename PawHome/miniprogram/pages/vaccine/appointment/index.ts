import {
  createServiceAppointment,
  getServiceOfferings,
  getServiceProviders,
  getServiceSlots
} from "../../../services/petServices";
import { getPetList } from "../../../services/user";
import { getVaccineCatalog } from "../../../services/vaccines";
import { buildServiceDateOptions, buildSuccessQuery } from "../../../utils/serviceBooking";
import { getBaseUrl } from "../../../config/env";

function getVaccineCategory(offeringName: string): "core" | "optional" {
  if (offeringName.includes("选择")) return "optional";
  return "core";
}

function toAbsoluteUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (/^data:/i.test(url)) return url;
  if (/^wxfile:\/\//i.test(url)) return url;
  if (url.startsWith("/assets/")) return url;
  const base = getBaseUrl();
  const origin = base.split("/").slice(0, 3).join("/");
  if (url.startsWith("/")) return origin + url;
  return origin + "/" + url;
}

Page({
  data: {
    pets: [] as any[],
    selectedPetId: "",
    vaccines: [] as any[],
    selectedVaccineId: "",
    vaccineCategory: "core" as "core" | "optional",
    vaccineNames: [] as any[],
    selectedVaccineNameId: "",
    selectedPrice: 0,
    hospitals: [] as any[],
    selectedHospitalId: "",
    mapMarkers: [] as any[],
    mapLat: 30.2741,
    mapLng: 120.1551,
    mapScale: 18,
    days: [] as any[],
    selectedDay: "",
    timeSlots: [] as any[],
    slots: [] as any[],
    selectedTime: "",
    selectedSlotId: "",
    remark: ""
  },

  async onLoad() {
    await this.loadPageData();
  },

  async loadPageData() {
    try {
      wx.showLoading({ title: "加载中..." });
      const [petList, providerPayload] = await Promise.all([
        getPetList(),
        getServiceProviders("vaccine")
      ]);
      const pets = (petList || []).map((item) => ({
        id: item.id,
        name: item.name,
        avatar: item.avatarUrl || "/assets/images/home/littleface@1x.png"
      }));
      const hospitals = (providerPayload.list || []).map((item) => ({
        ...item,
        coverImage: toAbsoluteUrl(item.coverImage || "")
      }));
      const selectedPetId = pets[0]?.id || "";
      const selectedHospitalId = hospitals[0]?.id || "";
      this.setData({
        pets,
        selectedPetId,
        hospitals,
        selectedHospitalId
      });
      this.refreshFakeMap();
      if (selectedHospitalId) {
        await this.loadVaccines(selectedHospitalId);
      }
    } catch (error: any) {
      wx.showToast({ title: error?.message || "加载失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  async loadVaccines(providerId: string) {
    const payload = await getServiceOfferings({ serviceType: "vaccine", providerId });
    const vaccines = (payload.list || []).map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      age: item.descList[0] || item.summary || "",
      cycle: item.descList[1] || "",
      availableDates: item.availableDates || [],
      descList: item.descList || []
    }));
    const selectedVaccineId = vaccines[0]?.id || "";
    const selectedPrice = vaccines[0]?.price || 0;
    const vaccineCategory = vaccines[0] ? getVaccineCategory(vaccines[0].name) : "core";
    this.setData({ vaccines, selectedVaccineId, selectedPrice, vaccineCategory });
    if (vaccines[0]) {
      await this.loadVaccineNames(vaccineCategory);
      await this.loadSlots(vaccines[0], vaccines[0]?.availableDates?.[0] || "");
    } else {
      this.setData({
        days: [],
        selectedDay: "",
        timeSlots: [],
        slots: [],
        selectedTime: "",
        selectedSlotId: "",
        selectedPrice: 0,
        vaccineNames: [],
        selectedVaccineNameId: ""
      });
    }
  },

  async loadVaccineNames(category: "core" | "optional") {
    const payload = await getVaccineCatalog(category);
    const vaccineNames = payload.list || [];
    this.setData({
      vaccineNames,
      selectedVaccineNameId: vaccineNames[0]?.id || ""
    });
  },

  async loadSlots(vaccine: any, dateValue?: string) {
    const days = buildServiceDateOptions(vaccine?.availableDates || []);
    const selectedDay = dateValue || days[0]?.value || "";
    if (!vaccine?.id || !selectedDay) {
      this.setData({
        days,
        selectedDay: "",
        timeSlots: [],
        slots: [],
        selectedTime: "",
        selectedSlotId: ""
      });
      return;
    }
    const payload = await getServiceSlots({ offeringId: vaccine.id, date: selectedDay });
    const slots = (payload.list || []).filter((item) => item.remaining > 0);
    const firstSlot = slots[0] || null;
    this.setData({
      days,
      selectedDay,
      timeSlots: slots,
      slots,
      selectedTime: firstSlot?.timeLabel || "",
      selectedSlotId: firstSlot?.id || "",
      selectedPrice: vaccine?.price || 0
    });
  },

  selectPet(e: any) {
    this.setData({ selectedPetId: e.currentTarget.dataset.id });
  },

  async selectVaccine(e: any) {
    const selectedVaccineId = e.currentTarget.dataset.id;
    const vaccine = this.data.vaccines.find((item: any) => item.id === selectedVaccineId);
    const vaccineCategory = vaccine ? getVaccineCategory(vaccine.name) : "core";
    this.setData({ selectedVaccineId, selectedPrice: vaccine ? vaccine.price : 0, vaccineCategory });
    await this.loadVaccineNames(vaccineCategory);
    await this.loadSlots(vaccine, vaccine?.availableDates?.[0] || "");
  },

  selectVaccineName(e: any) {
    this.setData({ selectedVaccineNameId: e.currentTarget.dataset.id });
  },

  onMapMarkerTap(e: any) {
    const markerId = e.detail.markerId;
    if (markerId !== undefined) {
      const marker = this.data.mapMarkers.find(m => m.id === markerId);
      if (marker) {
        this.selectHospital({ currentTarget: { dataset: { id: marker.providerId } } });
      }
    }
  },

  async selectHospital(e: any) {
    const selectedHospitalId = e.currentTarget.dataset.id;
    if (selectedHospitalId === this.data.selectedHospitalId) return;

    this.setData({ selectedHospitalId });
    const points = getHospitalPoints(this.data.hospitals || []);
    const selected = points.find((x) => x.providerId === selectedHospitalId);

    // 1. Zoom out
    this.setData({ mapScale: 11 });
    
    // 2. Pan to new location after zoom out finishes
    setTimeout(() => {
      if (selected) {
        this.setData({
          mapLat: selected.latitude,
          mapLng: selected.longitude
        });
      }
      
      // 3. Zoom back in
      setTimeout(() => {
        this.setData({ mapScale: 18 });
        this.refreshFakeMap(); // update pulse state
      }, 400);
    }, 400);

    await this.loadVaccines(selectedHospitalId);
  },

  refreshFakeMap() {
    const points = getHospitalPoints(this.data.hospitals || []);
    const selected = points.find((x) => x.providerId === this.data.selectedHospitalId) || points[0] || null;
    const mapMarkers = points.map((item) => ({
      ...item,
      active: item.providerId === (selected?.providerId || "")
    }));
    const updateData: any = { mapMarkers };
    if (selected && this.data.mapLat === 30.2741 && this.data.mapLng === 120.1551) {
      updateData.mapLat = selected.latitude;
      updateData.mapLng = selected.longitude;
      updateData.mapScale = 18;
    }
    this.setData(updateData);
  },

  async selectDay(e: any) {
    const selectedDay = e.currentTarget.dataset.key;
    const vaccine = this.data.vaccines.find((item: any) => item.id === this.data.selectedVaccineId);
    await this.loadSlots(vaccine, selectedDay);
  },

  selectTime(e: any) {
    const slotId = e.currentTarget.dataset.id;
    const slot = this.data.slots.find((item: any) => item.id === slotId);
    this.setData({
      selectedSlotId: slotId,
      selectedTime: slot?.timeLabel || ""
    });
  },

  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  async submit() {
    const pet = this.data.pets.find((item: any) => item.id === this.data.selectedPetId);
    const vaccine = this.data.vaccines.find((item: any) => item.id === this.data.selectedVaccineId);
    const hospital = this.data.hospitals.find((item: any) => item.id === this.data.selectedHospitalId);
    const slot = this.data.slots.find((item: any) => item.id === this.data.selectedSlotId);
    const vaccineName = this.data.vaccineNames.find((item: any) => item.id === this.data.selectedVaccineNameId);

    if (!pet || !vaccine || !hospital || !slot || !vaccineName) {
      wx.showToast({ title: "请完善预约信息", icon: "none" });
      return;
    }

    try {
      wx.showLoading({ title: "提交中..." });
      const appointment = await createServiceAppointment({
        serviceType: "vaccine",
        petId: pet.id,
        providerId: hospital.id,
        offeringId: vaccine.id,
        slotId: slot.id,
        appointmentAt: slot.appointmentAt,
        vaccineId: vaccineName.id,
        notes: this.data.remark
      });
      const query = buildSuccessQuery({
        type: "vaccine",
        petName: pet.name,
        itemName: vaccineName.name,
        storeName: appointment.provider?.name || hospital.name,
        date: appointment.serviceDate || slot.serviceDate,
        time: appointment.timeLabel || slot.timeLabel
      });
      const extra = query.startsWith("?") ? `&${query.slice(1)}` : query;
      wx.navigateTo({
        url: `/pages/vaccine/reminder/index?appointmentId=${appointment.id}${extra}`
      });
    } catch (error: any) {
      wx.showToast({ title: error?.message || "预约失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  }
});

function getHospitalPoints(hospitals: any[]) {
  const presets: Record<string, { lat: number; lng: number }> = {
    "provider-vaccine-1": { lat: 30.2741, lng: 120.1551 },
    "provider-vaccine-2": { lat: 31.2304, lng: 121.4737 } // Shanghai
  };
  return (hospitals || []).map((h, index) => {
    const preset = presets[h.id];
    let lat, lng;
    if (preset) {
      lat = preset.lat;
      lng = preset.lng;
    } else {
      lat = 30.2741 + (index * 0.08);
      lng = 120.1551 + (index * 0.08);
    }
    return { 
      id: index + 1, 
      providerId: h.id,
      latitude: lat, 
      longitude: lng,
      width: 0,
      height: 0,
      customCallout: {
        display: "ALWAYS",
        anchorY: 0,
        anchorX: 0
      }
    };
  });
}
