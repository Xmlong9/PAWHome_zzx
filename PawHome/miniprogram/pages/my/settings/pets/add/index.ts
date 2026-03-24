import { addPetProfile } from "../../../../../services/user";

Page({
  data: {
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

  onLoad() {
    // 可以在这里初始化一些数据
  },

  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
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
      'formData.breed': '' // 切换类型时重置品种
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
    const { formData } = this.data;
    
    // 简易校验
    if (!formData.name) return wx.showToast({ title: '请输入宠物名称', icon: 'none' });
    if (!formData.type) return wx.showToast({ title: '请选择宠物类型', icon: 'none' });
    if (!formData.breed) return wx.showToast({ title: '请选择品种', icon: 'none' });
    if (!formData.gender) return wx.showToast({ title: '请选择性别', icon: 'none' });
    if (!formData.birthday) return wx.showToast({ title: '请选择出生日期', icon: 'none' });
    if (!formData.weight) return wx.showToast({ title: '请输入体重', icon: 'none' });
    if (!formData.isSterilized) return wx.showToast({ title: '请选择是否绝育', icon: 'none' });

    // 如果没有上传头像，使用默认头像（需求中提到的淡水鱼的宠物涛涛的头像路径）
    const finalAvatar = formData.avatarUrl || '/assets/images/mine/宠物.png';

    wx.showLoading({ title: '添加中...' });
    
    try {
      const res = await addPetProfile({
        name: formData.name,
        avatarUrl: finalAvatar,
        gender: formData.gender as "帅哥" | "美女",
        weight: formData.weight + 'kg',
        isSterilized: formData.isSterilized as "是" | "否",
        birthday: formData.birthday.replace(/-/g, '.')
      });
      
      if (res.ok) {
        wx.hideLoading();
        wx.showToast({ title: '添加成功', icon: 'success' });
        // 触发全局事件通知刷新
        wx.setStorageSync('petListNeedRefresh', true);
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  }
});