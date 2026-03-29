import { searchCommunity, searchShop } from "../../services/search"

Page({
  data: {
    safeTop: 0,
    searchType: 'community', // 'community' | 'shop'
    keyword: '',
    isFocused: true,
    hasSearched: false, // 是否已经开始搜索

    // 搜索提示状态
    hotKeywords: ['萌宠日常', '宠物美容', '猫咪训练', '狗狗驱虫', '猫砂推荐'],
    historyKeywords: ['金毛幼犬喂养指南', '布偶猫美容技巧'],

    // 搜索结果状态
    categories: ['全部', '猫咪', '狗狗', '兔子', '鸟类'],
    currentCategory: '全部',
    
    sortTabs: ['综合', '最新'],
    currentSort: '综合',

    // 搜索结果数据
    results: [] as any[],
    page: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad(options: any) {
    const sysInfo = wx.getSystemInfoSync();
    const searchType = options.type || 'community'
    const historyKey = searchType === "community" ? "search_history_community" : "search_history_shop"
    const stored = wx.getStorageSync(historyKey)
    const historyKeywords = Array.isArray(stored) ? stored.filter((x) => typeof x === "string") : []
    this.setData({
      safeTop: sysInfo.safeArea?.top || 44,
      searchType, // 根据入口区分搜索类型
      historyKeywords
    });
  },

  goBack() {
    wx.navigateBack();
  },

  historyKey() {
    return this.data.searchType === "community" ? "search_history_community" : "search_history_shop"
  },

  categoryToType(cat: string) {
    if (cat === "猫咪") return "cat"
    if (cat === "狗狗") return "dog"
    return "all"
  },

  sortToParam(sort: string) {
    return sort === "最新" ? "latest" : "hot"
  },

  onInput(e: any) {
    this.setData({ keyword: e.detail.value });
  },

  onClear() {
    this.setData({ keyword: '', hasSearched: false, results: [], page: 1, hasMore: true });
  },

  onSearchConfirm(e?: any) {
    const kw = e?.detail?.value || this.data.keyword;
    if (!kw.trim()) return;
    
    this.setData({ 
      keyword: kw,
      hasSearched: true,
      isFocused: false,
      page: 1,
      results: [],
      hasMore: true
    });
    
    // 把关键词加入历史记录 (去重)
    let history = [...this.data.historyKeywords];
    history = history.filter(k => k !== kw);
    history.unshift(kw);
    if (history.length > 10) history.pop();
    this.setData({ historyKeywords: history });
    wx.setStorageSync(this.historyKey(), history)

    this.loadResults(true);
  },

  onTapKeyword(e: any) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw });
    this.onSearchConfirm();
  },

  onDeleteHistory(e: any) {
    const kw = e.currentTarget.dataset.kw;
    const history = this.data.historyKeywords.filter(k => k !== kw);
    this.setData({ historyKeywords: history });
    wx.setStorageSync(this.historyKey(), history)
  },

  switchCategory(e: any) {
    this.setData({ currentCategory: e.currentTarget.dataset.cat, page: 1, results: [], hasMore: true });
    this.loadResults(true);
  },

  switchSort(e: any) {
    this.setData({ currentSort: e.currentTarget.dataset.sort, page: 1, results: [], hasMore: true });
    this.loadResults(true);
  },

  onScrollToLower() {
    if (!this.data.hasSearched) return
    if (this.data.loading || !this.data.hasMore) return
    this.loadResults(false)
  },

  openCommunityItem(e: any) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/post-detail/index?id=${encodeURIComponent(String(id))}` })
  },

  openShopItem(e: any) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/shop/detail?id=${encodeURIComponent(String(id))}` })
  },

  async loadResults(reset = false) {
    const kw = this.data.keyword.trim()
    if (!kw) return
    if (this.data.loading) return
    this.setData({ loading: true })
    if (reset) wx.pageScrollTo({ scrollTop: 0 })
    try {
      if (this.data.searchType === 'community') {
        const page = reset ? 1 : this.data.page + 1
        const pageSize = this.data.pageSize
        const type = this.categoryToType(this.data.currentCategory)
        const sort = this.sortToParam(this.data.currentSort) as "hot" | "latest"
        const res = await searchCommunity(kw, page, pageSize, { type, sort })
        const results = res.list.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          image: r.image,
          likes: String(r.likes ?? 0),
          comments: String(r.comments ?? 0)
        }))
        const next = reset ? results : [...this.data.results, ...results]
        this.setData({ results: next, page, hasMore: results.length === pageSize })
      } else {
        const page = reset ? 1 : this.data.page + 1
        const pageSize = this.data.pageSize
        const res = await searchShop(kw, page, pageSize)
        const results = res.list.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          image: r.image,
          price: `¥ ${(r.price ?? 0).toFixed(2)}`
        }))
        const next = reset ? results : [...this.data.results, ...results]
        this.setData({ results: next, page, hasMore: results.length === pageSize })
      }
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '搜索失败', icon: 'none' })
      this.setData({ results: [] })
    } finally {
      this.setData({ loading: false })
    }
  }
});
