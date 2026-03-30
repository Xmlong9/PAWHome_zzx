import {
  createServiceAppointment,
  getServiceOfferings,
  getServiceProviders,
  getServiceSlots
} from "../../services/petServices";
import { getPetList } from "../../services/user";
import { buildServiceDateOptions, buildSuccessQuery } from "../../utils/serviceBooking";

Page({
  data: {
    pets: [] as any[],
    selectedPetId: "",
    vaccines: [] as any[],
    selectedVaccineId: "",
    selectedPrice: 0,
    hospitals: [] as any[],
    selectedHospitalId: "",
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
      const hospitals = providerPayload.list || [];
      const selectedPetId = pets[0]?.id || "";
      const selectedHospitalId = hospitals[0]?.id || "";
      this.setData({
        pets,
        selectedPetId,
        hospitals,
        selectedHospitalId
      });
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
    this.setData({ vaccines, selectedVaccineId, selectedPrice });
    if (vaccines[0]) {
      await this.loadSlots(vaccines[0], vaccines[0]?.availableDates?.[0] || "");
    } else {
      this.setData({
        days: [],
        selectedDay: "",
        timeSlots: [],
        slots: [],
        selectedTime: "",
        selectedSlotId: "",
        selectedPrice: 0
      });
    }
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
    this.setData({ selectedVaccineId, selectedPrice: vaccine ? vaccine.price : 0 });
    await this.loadSlots(vaccine, vaccine?.availableDates?.[0] || "");
  },

  async selectHospital(e: any) {
    const selectedHospitalId = e.currentTarget.dataset.id;
    this.setData({ selectedHospitalId });
    await this.loadVaccines(selectedHospitalId);
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

    if (!pet || !vaccine || !hospital || !slot) {
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
        notes: this.data.remark
      });
      wx.navigateTo({
        url: `/pages/vaccine/success/index${buildSuccessQuery({
          type: "vaccine",
          petName: pet.name,
          itemName: appointment.offering?.name || vaccine.name,
          storeName: appointment.provider?.name || hospital.name,
          date: appointment.serviceDate || slot.serviceDate,
          time: appointment.timeLabel || slot.timeLabel
        })}`
      });
    } catch (error: any) {
      wx.showToast({ title: error?.message || "预约失败", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  }
});
