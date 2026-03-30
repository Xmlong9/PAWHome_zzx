import { listServiceAppointments } from "../../../services/petServices";
import { getPetList } from "../../../services/user";

Page({
  data: {
    petIndex: 0,
    pets: [] as any[],
    currentPet: null as any,
    activeTab: "upcoming" as "upcoming" | "history",
    appointments: [] as any[]
  },

  async onLoad() {
    await this.loadPets();
    await this.refreshAppointments();
  },

  async onShow() {
    await this.refreshAppointments();
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
        await this.refreshAppointments();
      }
    );
  },

  setTab(e: any) {
    const tab = e.currentTarget.dataset.tab === "history" ? "history" : "upcoming";
    this.setData({ activeTab: tab }, async () => {
      await this.refreshAppointments();
    });
  },

  async refreshAppointments() {
    const petId = this.data.currentPet?.id;
    if (!petId) {
      this.setData({ appointments: [] });
      return;
    }
    try {
      const payload = await listServiceAppointments({
        page: 1,
        pageSize: 50,
        status: "all",
        serviceType: "vaccine",
        petId
      } as any);
      const now = Date.now();
      const items = (payload.list || []).map((a: any) => {
        const t = new Date(a.appointmentAt || "").getTime();
        const isPast = Number.isNaN(t) ? false : t < now;
        const isHistory = this.data.activeTab === "history";
        const show = isHistory ? isPast || a.status !== "scheduled" : !isPast && a.status === "scheduled";
        return {
          id: a.id,
          show,
          title: (a.vaccine && a.vaccine.name) || (a.offering && a.offering.name) || "接种预约",
          line1: `${formatDate(a.serviceDate)} ${a.timeLabel || ""}`.trim(),
          line2: (a.provider && a.provider.name) || "",
          statusText: isPast ? "已过期" : "已预约",
          statusClass: isPast ? "status-history" : "status-upcoming"
        };
      });
      this.setData({ appointments: items.filter((x: any) => x.show) });
    } catch {
      this.setData({ appointments: [] });
    }
  },

  openDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/vaccine/appointments/detail/index?appointmentId=${encodeURIComponent(id)}` });
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
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years <= 0 && remMonths <= 0) return "";
  if (years > 0 && remMonths > 0) return `${years}岁${remMonths}个月`;
  if (years > 0) return `${years}岁`;
  return `${remMonths}个月`;
}

