import { getBaseUrl } from "../../config/env";

Page({
  data: {
    type: 'vaccine',
    pageTitle: '服务预约',
    itemLabel: '服务',
    storeLabel: '门店',
    showSheet: false,
    
    pets: [
      { id: '1', name: '涛涛', avatar: '/assets/images/home/littleface@1x.png' },
      { id: '2', name: '宠宠', avatar: '/assets/images/home/littleface@1x.png' }
    ],
    selectedPetId: '1',

    serviceItems: [] as any[],
    selectedItemId: '',

    stores: [
      { id: 's1', name: 'XX宠物医院', distance: '0.8km', hours: '09:00-21:00', rating: '4.9' },
      { id: 's2', name: 'XX宠物诊所', distance: '1.2km', hours: '08:30-20:30', rating: '4.8' }
    ],
    selectedStoreId: 's1',
    selectedStore: null as any,

    selectedDate: 'today',
    timeSlots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    selectedTime: '09:00',
    remark: '',

    totalPrice: 0
  },

  onLoad(options: any) {
    const type = options.type || 'vaccine';
    this.setData({ type });
    this.initServiceData(type);
    
    this.updateSelectedStore();
  },

  initServiceData(type: string) {
    let pageTitle = '服务预约';
    let itemLabel = '项目';
    let storeLabel = '门店';
    let serviceItems: any[] = [];

    if (type === 'vaccine') {
      pageTitle = '疫苗预约';
      itemLabel = '疫苗';
      storeLabel = '医院';
      serviceItems = [
        { id: 'v1', name: '核心疫苗（狂犬/多联）', descList: ['适用年龄: 2-4个月', '接种周期: 每年一次'], price: 268 },
        { id: 'v2', name: '选择性疫苗', descList: ['适用年龄: 3个月以上', '接种周期: 每年一次'], price: 198 }
      ];
    } else if (type === 'beauty') {
      pageTitle = '美容预约';
      itemLabel = '美容项目';
      serviceItems = [
        { id: 'b1', name: '基础洗护', descList: ['包含洗澡、剪指甲、清耳朵等', '适用: 小型犬/猫'], price: 88 },
        { id: 'b2', name: '全身造型', descList: ['包含洗护及全身毛发修剪', '适用: 全犬种/猫'], price: 188 }
      ];
    } else if (type === 'medical') {
      pageTitle = '医疗预约';
      itemLabel = '就诊科室';
      storeLabel = '医院';
      serviceItems = [
        { id: 'm1', name: '常规内科', descList: ['常见疾病诊断与治疗', '包含基础检查'], price: 50 },
        { id: 'm2', name: '外科手术', descList: ['外科创伤处理、绝育等', '需提前禁食禁水'], price: 200 }
      ];
    } else if (type === 'foster') {
      pageTitle = '寄养预约';
      itemLabel = '寄养房型';
      serviceItems = [
        { id: 'f1', name: '标准舱', descList: ['适合中小型宠物，独立通风', '每日两次遛狗/逗猫'], price: 80 },
        { id: 'f2', name: '豪华套房', descList: ['超大空间，24小时监控', '专属管家服务'], price: 150 }
      ];
    }

    wx.setNavigationBarTitle({ title: pageTitle });
    
    this.setData({
      pageTitle,
      itemLabel,
      storeLabel,
      serviceItems,
      selectedItemId: serviceItems[0]?.id || ''
    });
    this.calcTotal();
  },

  updateSelectedStore() {
    const store = this.data.stores.find(s => s.id === this.data.selectedStoreId);
    this.setData({ selectedStore: store });
  },

  selectPet(e: any) {
    this.setData({ selectedPetId: e.currentTarget.dataset.id });
  },

  selectItem(e: any) {
    this.setData({ selectedItemId: e.currentTarget.dataset.id });
    this.calcTotal();
  },

  chooseStore() {
    // Optionally implemented bottom sheet store selector, for now just toggle
  },

  selectStore(e: any) {
    this.setData({ selectedStoreId: e.currentTarget.dataset.id });
    this.updateSelectedStore();
  },

  selectDate(e: any) {
    this.setData({ selectedDate: e.currentTarget.dataset.val });
  },

  selectTimeSlot(e: any) {
    this.setData({ selectedTime: e.currentTarget.dataset.val });
  },

  bindRemarkInput(e: any) {
    this.setData({ remark: e.detail.value });
  },

  openSheet() {
    this.setData({ showSheet: true });
  },

  closeSheet() {
    this.setData({ showSheet: false });
  },

  calcTotal() {
    const item = this.data.serviceItems.find(i => i.id === this.data.selectedItemId);
    this.setData({ totalPrice: item ? item.price : 0 });
  },

  submitOrder() {
    if (!this.data.selectedPetId) {
      wx.showToast({ title: '请选择宠物', icon: 'none' });
      return;
    }
    if (!this.data.selectedStoreId) {
      wx.showToast({ title: '请选择门店', icon: 'none' });
      return;
    }
    if (!this.data.selectedTime) {
      wx.showToast({ title: '请选择预约时间', icon: 'none' });
      return;
    }
    
    const pet = this.data.pets.find(p => p.id === this.data.selectedPetId);
    const item = this.data.serviceItems.find(i => i.id === this.data.selectedItemId);
    const store = this.data.selectedStore;

    // mock date string based on selectedDate
    const d = new Date();
    if (this.data.selectedDate === 'tomorrow') d.setDate(d.getDate() + 1);
    if (this.data.selectedDate === 'after_tomorrow') d.setDate(d.getDate() + 2);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    wx.showLoading({ title: '提交中...' });
    setTimeout(() => {
      wx.hideLoading();
      
      const query = `?type=${this.data.type}&petName=${encodeURIComponent(pet?.name || '')}&itemName=${encodeURIComponent(item?.name || '')}&storeName=${encodeURIComponent(store?.name || '')}&date=${dateStr}&time=${this.data.selectedTime}`;
      
      wx.navigateTo({
        url: `/pages/service/success/index${query}`
      });
    }, 800);
  }
});
