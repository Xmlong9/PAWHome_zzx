Page({
  data: {
    pets: [
      { id: "p1", name: "涛涛", avatar: "/assets/images/home/littleface@1x.png" },
      { id: "p2", name: "宠宠", avatar: "/assets/images/home/littleface@1x.png" }
    ],
    selectedPetId: "p1",
    vaccines: [
      { id: "v1", name: "核心疫苗（狂犬/多联）", price: 268, age: "适用年龄：2-4个月", cycle: "接种周期：每年一次" },
      { id: "v2", name: "选择性疫苗", price: 198, age: "适用年龄：3个月以上", cycle: "接种周期：每年一次" }
    ],
    selectedVaccineId: "v1",
    selectedPrice: 268,
    hospitals: [
      { id: "h1", name: "XX宠物医院", distance: "0.8km", rating: "4.9", hours: "09:00-21:00" },
      { id: "h2", name: "XX宠物诊所", distance: "1.2km", rating: "4.8", hours: "08:30-20:30" }
    ],
    selectedHospitalId: "h1",
    days: [
      { key: "today", label: "今天" },
      { key: "tomorrow", label: "明天" },
      { key: "after_tomorrow", label: "后天" }
    ],
    selectedDay: "today",
    timeSlots: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    selectedTime: "09:00",
    remark: ""
  },

  selectPet(e: any) {
    this.setData({ selectedPetId: e.currentTarget.dataset.id });
  },

  selectVaccine(e: any) {
    const selectedVaccineId = e.currentTarget.dataset.id;
    const v = this.data.vaccines.find((x: any) => x.id === selectedVaccineId);
    this.setData({ selectedVaccineId, selectedPrice: v ? v.price : 0 });
  },

  selectHospital(e: any) {
    this.setData({ selectedHospitalId: e.currentTarget.dataset.id });
  },

  selectDay(e: any) {
    this.setData({ selectedDay: e.currentTarget.dataset.key });
  },

  selectTime(e: any) {
    this.setData({ selectedTime: e.currentTarget.dataset.time });
  },

  onRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  getDateStr() {
    const d = new Date();
    if (this.data.selectedDay === "tomorrow") d.setDate(d.getDate() + 1);
    if (this.data.selectedDay === "after_tomorrow") d.setDate(d.getDate() + 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },

  submit() {
    const pet = this.data.pets.find((x: any) => x.id === this.data.selectedPetId);
    const vaccine = this.data.vaccines.find((x: any) => x.id === this.data.selectedVaccineId);
    const hospital = this.data.hospitals.find((x: any) => x.id === this.data.selectedHospitalId);

    if (!pet || !vaccine || !hospital) {
      wx.showToast({ title: "请完善预约信息", icon: "none" });
      return;
    }

    const dateStr = this.getDateStr();
    const timeStr = this.data.selectedTime;

    const query = `?petName=${encodeURIComponent(pet.name)}&itemName=${encodeURIComponent(vaccine.name)}&storeName=${encodeURIComponent(hospital.name)}&date=${dateStr}&time=${timeStr}`;
    wx.navigateTo({ url: `/pages/vaccine/success/index${query}` });
  }
});
