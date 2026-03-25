import { listAddresses, UserAddress } from "../../../../services/shop";

Page({
  data: {
    addresses: [] as UserAddress[]
  },
  onLoad() {
    this.fetchAddresses();
  },
  async fetchAddresses() {
    wx.showLoading({ title: '加载中...' });
    try {
      const addresses = await listAddresses();
      this.setData({ addresses });
    } catch (err) {
      wx.showToast({ title: '获取地址失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
  onAdd() {
    wx.showToast({ title: '新增地址开发中...', icon: 'none' });
  },
  onEdit(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `编辑地址: ${id} 开发中...`, icon: 'none' });
  }
});
