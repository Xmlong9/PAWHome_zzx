const {
  clearInvalidCartItems,
  listCartItems,
  listProducts,
  setAllCartChecked,
  updateCartItem
} = require("../../services/shop")

Page({
  data: {
    cartList: [],
    invalidList: [],
    recommendList: [],
    allChecked: false,
    checkedCount: 0,
    totalAmount: 0,
    safeTop: 0,
    safeBottom: 0
  },
  onLoad() {
    const info = wx.getSystemInfoSync()
    const safeBottom = info.safeArea ? info.screenHeight - info.safeArea.bottom : 0
    this.setData({
      safeTop: info.statusBarHeight || 0,
      safeBottom
    })
  },
  onShow() {
    this.loadPageData()
  },
  async loadPageData() {
    try {
      const [cartList, recommendList] = await Promise.all([
        listCartItems(),
        listProducts()
      ])
      const valid = cartList
        .filter((item) => !item.invalid && item.product)
        .map((item) => ({
          ...item,
          id: item.product.id,
          lineAmount: Number((item.product.price * item.count).toFixed(2))
        }))
      const invalid = cartList
        .filter((item) => item.invalid)
        .map((item) => ({
          ...item,
          id: (item.product && item.product.id) || `invalid_${Math.random()}`,
          lineAmount: 0
        }))
      const checkedList = valid.filter((item) => item.checked)
      const allChecked = valid.length > 0 && checkedList.length === valid.length
      const checkedCount = checkedList.reduce((sum, item) => sum + item.count, 0)
      const totalAmount = Number(checkedList.reduce((sum, item) => sum + item.lineAmount, 0).toFixed(2))
      this.setData({
        cartList: valid,
        invalidList: invalid,
        recommendList: recommendList.slice(0, 2),
        allChecked,
        checkedCount,
        totalAmount
      })
    } catch (error) {
      wx.showToast({ title: "购物车加载失败", icon: "none" })
    }
  },
  openDetail(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/shop/detail?id=${encodeURIComponent(id)}` })
  },
  async toggleAll() {
    await setAllCartChecked(!this.data.allChecked)
    await this.loadPageData()
  },
  async toggleItem(e) {
    const { id, checked } = e.currentTarget.dataset
    await updateCartItem(id, { checked: !checked })
    await this.loadPageData()
  },
  async plusCount(e) {
    const { id, count } = e.currentTarget.dataset
    await updateCartItem(id, { count: count + 1 })
    await this.loadPageData()
  },
  async minusCount(e) {
    const { id, count } = e.currentTarget.dataset
    await updateCartItem(id, { count: Math.max(1, count - 1) })
    await this.loadPageData()
  },
  async clearInvalid() {
    await clearInvalidCartItems()
    await this.loadPageData()
  },
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack()
      return
    }
    wx.switchTab({ url: "/pages/shop/index" })
  },
  goCheckout() {
    wx.navigateTo({ url: "/pages/shop/order/checkout?from=cart" })
  }
})
