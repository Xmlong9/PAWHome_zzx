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
    
    sortTabs: ['综合', '最新', '话题', '用户'],
    currentSort: '综合',

    // 搜索结果数据
    results: [] as any[]
  },

  onLoad(options: any) {
    const sysInfo = wx.getSystemInfoSync();
    this.setData({
      safeTop: sysInfo.safeArea?.top || 44,
      searchType: options.type || 'community', // 根据入口区分搜索类型
    });
  },

  goBack() {
    wx.navigateBack();
  },

  onInput(e: any) {
    this.setData({ keyword: e.detail.value });
  },

  onClear() {
    this.setData({ keyword: '', hasSearched: false, results: [] });
  },

  onSearchConfirm(e?: any) {
    const kw = e?.detail?.value || this.data.keyword;
    if (!kw.trim()) return;
    
    this.setData({ 
      keyword: kw,
      hasSearched: true,
      isFocused: false
    });
    
    // 把关键词加入历史记录 (去重)
    let history = [...this.data.historyKeywords];
    history = history.filter(k => k !== kw);
    history.unshift(kw);
    if (history.length > 10) history.pop();
    this.setData({ historyKeywords: history });

    this.loadResults();
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
  },

  switchCategory(e: any) {
    this.setData({ currentCategory: e.currentTarget.dataset.cat });
    this.loadResults();
  },

  switchSort(e: any) {
    this.setData({ currentSort: e.currentTarget.dataset.sort });
    this.loadResults();
  },

  async loadResults() {
    const kw = this.data.keyword.trim()
    if (!kw) return
    wx.showLoading({ title: '搜索中...' })
    try {
      if (this.data.searchType === 'community') {
        const res = await searchCommunity(kw, 1, 10)
        const results = res.list.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          image: r.image,
          likes: String(r.likes ?? 0),
          comments: String(r.comments ?? 0)
        }))
        this.setData({ results })
      } else {
        const res = await searchShop(kw, 1, 10)
        const results = res.list.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          image: r.image,
          price: `¥ ${(r.price ?? 0).toFixed(2)}`
        }))
        this.setData({ results })
      }
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '搜索失败', icon: 'none' })
      this.setData({ results: [] })
    } finally {
      wx.hideLoading()
    }
  }
});
