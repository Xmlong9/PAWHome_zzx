import { getPetList } from "../../../services/user";
import { getDewormingRecords, getUpcomingVaccineReminder, getVaccineStatus } from "../../../services/vaccines";

Page({
  data: {
    petIndex: 0,
    pets: [] as any[],
    currentPet: null as any,
    activeTab: "core",
    records: [] as any[],
    upcomingReminder: null as any,
    upcomingLabel: "",
    upcomingSub: ""
  },

  async onLoad() {
    await this.loadPets();
    await this.refreshAll();
  },

  async onShow() {
    await this.refreshAll();
  },

  async loadPets() {
    const petList = await getPetList();
    const pets = (petList || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      meta: buildPetMeta(item),
      avatar: item.avatarUrl || "/assets/images/home/littleface@1x.png"
    }));
    const petIndex = 0;
    this.setData({
      pets,
      petIndex,
      currentPet: pets[petIndex] || null
    });
  },

  async switchPet() {
    if (!this.data.pets.length) return;
    const next = (this.data.petIndex + 1) % this.data.pets.length;
    this.setData(
      {
        petIndex: next,
        currentPet: this.data.pets[next] || null
      },
      async () => {
        await this.refreshAll();
      }
    );
  },

  async setTab(e: any) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab }, async () => {
      await this.refreshRecords();
    });
  },

  async refreshAll() {
    await Promise.all([this.refreshUpcomingReminder(), this.refreshRecords()]);
  },

  async refreshUpcomingReminder() {
    if (!this.data.currentPet?.id) {
      this.setData({ upcomingReminder: null, upcomingLabel: "", upcomingSub: "" });
      return;
    }
    try {
      const payload = await getUpcomingVaccineReminder(this.data.currentPet.id);
      const reminder = payload?.reminder || null;
      if (!reminder) {
        this.setData({ upcomingReminder: null, upcomingLabel: "", upcomingSub: "" });
        return;
      }
      const upcomingLabel = formatRelativeDays(reminder.remindAt);
      const upcomingSub = reminder.vaccineName || "";
      this.setData({ upcomingReminder: reminder, upcomingLabel, upcomingSub });
    } catch {
      this.setData({ upcomingReminder: null, upcomingLabel: "", upcomingSub: "" });
    }
  },

  async refreshRecords() {
    const petId = this.data.currentPet?.id;
    if (!petId) {
      this.setData({ records: [] });
      return;
    }
    const { activeTab } = this.data;
    if (activeTab === "deworm") {
      const payload = await getDewormingRecords(petId);
      const records = (payload.list || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        status: formatDate(item.recordAt),
        line1: item.providerName || "",
        line2: item.notes || "",
        footerText: ""
      }));
      this.setData({ records });
      return;
    }

    const payload = await getVaccineStatus({
      petId,
      category: activeTab
    });
    const records = (payload.list || []).map((item: any) => ({
      id: item.id,
      title: item.name,
      status: item.vaccinated ? "已完成" : "未接种",
      line1: item.vaccinated ? formatDate(item.lastVaccinatedAt) : "暂无记录",
      line2: item.vaccinated ? item.providerName || "" : "",
      footerText: ""
    }));
    this.setData({ records });
  },

  goAppointment() {
    wx.navigateTo({ url: "/pages/vaccine/appointment/index" });
  },

  goReminder() {
    wx.navigateTo({ url: "/pages/vaccine/reminder/index" });
  },

  goImport() {
    wx.navigateTo({ url: "/pages/vaccine/import/index" });
  }
});

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatRelativeDays(iso: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const now = Date.now();
  const diffMs = t - now;
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "今天";
  return `${diffDays}天后`;
}

function buildPetMeta(pet: any) {
  const parts: string[] = [];
  const breedOrType = pet.breed || pet.type || "";
  if (breedOrType) parts.push(breedOrType);
  const age = calcAge(pet.birthday);
  if (age) parts.push(age);
  if (pet.gender) parts.push(pet.gender);
  return parts.join(" | ");
}

function calcAge(birthdayIso: string) {
  if (!birthdayIso) return "";
  const b = new Date(birthdayIso);
  if (Number.isNaN(b.getTime())) return "";
  const now = new Date();
  let months =
    (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years <= 0 && remMonths <= 0) return "";
  if (years > 0 && remMonths > 0) return `${years}岁${remMonths}个月`;
  if (years > 0) return `${years}岁`;
  return `${remMonths}个月`;
}
