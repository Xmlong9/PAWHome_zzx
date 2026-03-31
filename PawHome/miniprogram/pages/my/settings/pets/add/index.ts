import { addPetProfile, updatePetProfile } from "../../../../../services/user";
import { uploadFile } from "../../../../../services/upload";
import { request } from "../../../../../services/request";
import { resolveImageSrc } from "../../../../../utils/mediaCache";

Page({
  data: {
    petId: '',
    isEditMode: false,
    submitText: '确认添加',
    avatarUrlRaw: "",
    formData: {
      avatarUrl: '',
      name: '',
      type: '',
      breed: '',
      gender: '',
      birthday: '',
      weight: '',
      isSterilized: ''
    },
    types: ['狗狗', '猫咪', '小宠', '水族', '爬宠', '其他'],
    typeIndex: -1,
    
    // 简易品种映射
    breedsMap: {
      '狗狗': ['金毛', '哈士奇', '柯基', '柴犬', '拉布拉多', '泰迪', '其他'],
      '猫咪': ['布偶', '英短', '美短', '暹罗', '加菲', '中华田园猫', '其他'],
      '小宠': ['仓鼠', '兔子', '龙猫', '貂', '豚鼠', '其他'],
      '水族': ['金鱼', '锦鲤', '孔雀鱼', '热带鱼', '龟', '其他'],
      '爬宠': ['蜥蜴', '蛇', '蛙', '蜘蛛', '其他'],
      '其他': ['未知品种']
    } as Record<string, string[]>,
    currentBreeds: [] as string[],
    breedIndex: -1
  },

  async onLoad(options: Record<string, string>) {
    if (options.id) {
      wx.setNavigationBarTitle({ title: '编辑宠物' });
      this.setData({
        petId: options.id,
        isEditMode: true,
        submitText: '保存资料'
      });
      await this.loadPetDetail(options.id);
    }
  },

  async loadPetDetail(id: string) {
    wx.showLoading({ title: '加载中...' });
    try {
      const petInfo = await request<any>({ url: "/users/me/pet", method: "GET", data: { id } });
      const avatarUrlRaw = String(petInfo?.avatarUrl || "")
      const avatarDisplay = avatarUrlRaw ? await resolveImageSrc(avatarUrlRaw) : ""
      const typeIndex = petInfo.type ? this.data.types.findIndex(item => item === petInfo.type) : -1;
      const currentBreeds = typeIndex > -1 ? this.data.breedsMap[this.data.types[typeIndex]] || [] : [];
      const breedIndex = petInfo.breed ? currentBreeds.findIndex(item => item === petInfo.breed) : -1;
      this.setData({
        avatarUrlRaw,
        typeIndex,
        currentBreeds,
        breedIndex,
        formData: {
          avatarUrl: avatarDisplay || '',
          name: petInfo.name || '',
          type: petInfo.type || '',
          breed: petInfo.breed || '',
          gender: petInfo.gender || '',
          birthday: (petInfo.birthday || '').replace(/\./g, '-'),
          weight: (petInfo.weight || '').replace(/kg$/i, ''),
          isSterilized: petInfo.isSterilized || ''
        }
      });
    } catch (err) {
      wx.showToast({ title: '获取宠物失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          avatarUrlRaw: tempFilePath,
          'formData.avatarUrl': tempFilePath
        });
      }
    });
  },

  onInput(e: any) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  onTypeChange(e: any) {
    const index = e.detail.value;
    const selectedType = this.data.types[index];
    this.setData({
      typeIndex: index,
      'formData.type': selectedType,
      currentBreeds: this.data.breedsMap[selectedType] || [],
      breedIndex: -1,
      'formData.breed': ''
    });
  },

  onBreedChange(e: any) {
    if (this.data.typeIndex === -1) {
      wx.showToast({ title: '请先选择宠物类型', icon: 'none' });
      return;
    }
    const index = e.detail.value;
    this.setData({
      breedIndex: index,
      'formData.breed': this.data.currentBreeds[index]
    });
  },

  onGenderSelect(e: any) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'formData.gender': gender
    });
  },

  onDateChange(e: any) {
    this.setData({
      'formData.birthday': e.detail.value
    });
  },

  onSterilizedSelect(e: any) {
    const val = e.currentTarget.dataset.value;
    this.setData({
      'formData.isSterilized': val
    });
  },

  async onSubmit() {
    const { formData, isEditMode, petId } = this.data;

    if (!formData.name) return wx.showToast({ title: '请输入宠物名称', icon: 'none' });
    if (!formData.type) return wx.showToast({ title: '请选择宠物类型', icon: 'none' });
    if (!formData.breed) return wx.showToast({ title: '请选择品种', icon: 'none' });
    if (!formData.gender) return wx.showToast({ title: '请选择性别', icon: 'none' });
    if (!formData.birthday) return wx.showToast({ title: '请选择出生日期', icon: 'none' });
    if (!formData.weight) return wx.showToast({ title: '请输入体重', icon: 'none' });
    if (!formData.isSterilized) return wx.showToast({ title: '请选择是否绝育', icon: 'none' });

    const rawAvatar = String((this.data as any).avatarUrlRaw || "").trim()
    const fallbackAvatar = '/assets/images/mine/宠物.png'
    const isLocal =
      !!rawAvatar &&
      (/^wxfile:\/\//i.test(rawAvatar) ||
        /^[a-zA-Z]:\\/.test(rawAvatar) ||
        rawAvatar.startsWith("file://") ||
        (rawAvatar.includes("__tmp__") && (rawAvatar.includes("127.0.0.1") || rawAvatar.includes("localhost"))) ||
        (!/^https?:\/\//i.test(rawAvatar) && !rawAvatar.startsWith("/")))
    const finalAvatar = isLocal ? await uploadFile(rawAvatar) : (rawAvatar || fallbackAvatar)
    const payload = {
      name: formData.name,
      avatarUrl: finalAvatar,
      type: formData.type,
      breed: formData.breed,
      gender: formData.gender as "帅哥" | "美女",
      weight: `${formData.weight}`.endsWith('kg') ? formData.weight : `${formData.weight}kg`,
      isSterilized: formData.isSterilized as "是" | "否",
      birthday: formData.birthday.replace(/-/g, '.')
    };

    wx.showLoading({ title: isEditMode ? '保存中...' : '添加中...' });
    try {
      const res = isEditMode ? await updatePetProfile(petId, payload) : await addPetProfile(payload);
      if (res.ok) {
        wx.hideLoading();
        wx.showToast({ title: isEditMode ? '保存成功' : '添加成功', icon: 'success' });
        wx.setStorageSync('petListNeedRefresh', true);
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: isEditMode ? '保存失败' : '添加失败', icon: 'none' });
    }
  }
});
