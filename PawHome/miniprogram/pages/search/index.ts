import { searchCommunity, searchShop } from "../../services/search"
import { debounce } from "../../utils/debounce"
import { getSearchCache, makeSearchCacheKey, setSearchCache } from "../../utils/searchCache"
import { navigateBackWithTransition } from "../../utils/transition"

Page({
  data: {
    safeTop: 0,
    searchType: 'community', // 'community' | 'shop'
    keyword: '',
    isFocused: true,
    hasSearched: false, // 是否已经开始搜索
    suggestions: [] as string[],
    showSuggestions: false,

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
    hasMore: true,
    requestSeq: 0
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

    ;(this as any)._debouncedRealtimeSearch = debounce(() => {
      this.triggerRealtimeSearch()
    }, 400)
  },

  goBack() {
    navigateBackWithTransition()
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
    const keyword = String(e.detail.value || "")
    this.setData({ keyword, isFocused: true, showSuggestions: true })
    const kw = keyword.trim()
    if (!kw) {
      this.setData({ hasSearched: false, results: [], page: 1, hasMore: true, suggestions: [] })
      return
    }
    this.setData({ hasSearched: true, page: 1, results: [], hasMore: true })
    this.updateSuggestions(kw)
    ;(this as any)._debouncedRealtimeSearch()
  },

  onClear() {
    this.setData({
      keyword: "",
      hasSearched: false,
      results: [],
      page: 1,
      hasMore: true,
      loading: false,
      suggestions: [],
      showSuggestions: false,
      isFocused: true
    })
  },

  onSearchConfirm(e?: any) {
    const kw = e?.detail?.value || this.data.keyword;
    if (!kw.trim()) return;
    this.triggerSearch(kw, { blur: true, addHistory: true })
  },

  onTapKeyword(e: any) {
    const kw = e.currentTarget.dataset.kw;
    this.setData({ keyword: kw });
    this.triggerSearch(kw, { blur: true, addHistory: true })
  },

  onDeleteHistory(e: any) {
    const kw = e.currentTarget.dataset.kw;
    const history = this.data.historyKeywords.filter(k => k !== kw);
    this.setData({ historyKeywords: history });
    wx.setStorageSync(this.historyKey(), history)
  },

  switchCategory(e: any) {
    this.setData({ currentCategory: e.currentTarget.dataset.cat, page: 1, results: [], hasMore: true });
    this.triggerRealtimeSearch()
  },

  switchSort(e: any) {
    this.setData({ currentSort: e.currentTarget.dataset.sort, page: 1, results: [], hasMore: true });
    this.triggerRealtimeSearch()
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
    const seq = this.data.requestSeq + 1
    this.setData({ loading: true, requestSeq: seq })
    if (reset) wx.pageScrollTo({ scrollTop: 0 })
    try {
      if (this.data.searchType === 'community') {
        const page = reset ? 1 : this.data.page + 1
        const pageSize = this.data.pageSize
        const type = this.categoryToType(this.data.currentCategory)
        const sort = this.sortToParam(this.data.currentSort) as "hot" | "latest"
        const cacheKey = makeSearchCacheKey({ kind: "community", kw, pageSize, type, sort })
        if (reset && page === 1) {
          const cached = getSearchCache<any>(cacheKey, 24 * 60 * 60 * 1000)
          if (cached && Array.isArray(cached.list)) {
            const mapped = cached.list.map((r: any) => this.mapCommunityResult(r, kw))
            this.setData({ results: mapped, page: 1, hasMore: mapped.length === pageSize })
          }
        }

        const res = await searchCommunity(kw, page, pageSize, { type, sort })
        if (this.data.requestSeq !== seq) return
        const results = res.list.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          titleSegs: this.highlightSegs(r.title, kw),
          summarySegs: this.highlightSegs(r.summary, kw),
          image: r.image,
          likes: String(r.likes ?? 0),
          comments: String(r.comments ?? 0)
        }))
        const next = reset ? results : [...this.data.results, ...results]
        this.setData({ results: next, page, hasMore: results.length === pageSize })
        if (reset && page === 1) setSearchCache(cacheKey, res, 50)
        this.updateSuggestionsFromResults(kw, results.map((x) => x.title))
      } else {
        const page = reset ? 1 : this.data.page + 1
        const pageSize = this.data.pageSize
        const cacheKey = makeSearchCacheKey({ kind: "shop", kw, pageSize })
        if (reset && page === 1) {
          const cached = getSearchCache<any>(cacheKey, 24 * 60 * 60 * 1000)
          if (cached && Array.isArray(cached.list)) {
            const mapped = cached.list.map((r: any) => this.mapShopResult(r, kw))
            this.setData({ results: mapped, page: 1, hasMore: mapped.length === pageSize })
          }
        }

        const res = await searchShop(kw, page, pageSize)
        if (this.data.requestSeq !== seq) return
        const results = res.list.map((r) => ({
          id: r.id,
          title: r.title,
          summary: r.summary,
          titleSegs: this.highlightSegs(r.title, kw),
          summarySegs: this.highlightSegs(r.summary, kw),
          image: r.image,
          price: `¥ ${(r.price ?? 0).toFixed(2)}`
        }))
        const next = reset ? results : [...this.data.results, ...results]
        this.setData({ results: next, page, hasMore: results.length === pageSize })
        if (reset && page === 1) setSearchCache(cacheKey, res, 50)
        this.updateSuggestionsFromResults(kw, results.map((x) => x.title))
      }
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '搜索失败', icon: 'none' })
      this.setData({ results: [] })
    } finally {
      if (this.data.requestSeq === seq) this.setData({ loading: false })
    }
  },

  onFocus() {
    this.setData({ isFocused: true, showSuggestions: true })
    const kw = this.data.keyword.trim()
    if (kw) this.updateSuggestions(kw)
  },

  onBlur() {
    this.setData({ isFocused: false, showSuggestions: false })
  },

  onTapSuggestion(e: any) {
    const kw = e.currentTarget.dataset.kw
    if (!kw) return
    this.triggerSearch(String(kw), { blur: true, addHistory: true })
  },

  triggerSearch(kw: string, opts: { blur: boolean; addHistory: boolean }) {
    const keyword = String(kw || "").trim()
    if (!keyword) return

    this.setData({
      keyword,
      hasSearched: true,
      isFocused: !opts.blur,
      showSuggestions: !opts.blur,
      page: 1,
      results: [],
      hasMore: true
    })

    if (opts.addHistory) {
      let history = [...this.data.historyKeywords]
      history = history.filter((k) => k !== keyword)
      history.unshift(keyword)
      if (history.length > 10) history.pop()
      this.setData({ historyKeywords: history })
      wx.setStorageSync(this.historyKey(), history)
    }

    this.updateSuggestions(keyword)
    this.loadResults(true)
  },

  triggerRealtimeSearch() {
    const kw = this.data.keyword.trim()
    if (!kw) return
    this.setData({ hasSearched: true, page: 1, results: [], hasMore: true })
    this.updateSuggestions(kw)
    this.loadResults(true)
  },

  updateSuggestions(kw: string) {
    const q = kw.trim()
    if (!q) {
      this.setData({ suggestions: [] })
      return
    }
    const lower = q.toLowerCase()
    const cand = [
      ...this.data.historyKeywords.filter((x) => x.toLowerCase().includes(lower)),
      ...this.data.hotKeywords.filter((x) => x.toLowerCase().includes(lower))
    ]
    const uniq: string[] = []
    for (const s of cand) {
      if (uniq.includes(s)) continue
      uniq.push(s)
      if (uniq.length >= 8) break
    }
    this.setData({ suggestions: uniq })
  },

  updateSuggestionsFromResults(kw: string, titles: string[]) {
    const q = kw.trim()
    if (!q) return
    const uniq = [...this.data.suggestions]
    for (const t of titles) {
      if (!t) continue
      if (uniq.includes(t)) continue
      uniq.unshift(t)
      if (uniq.length > 8) uniq.pop()
    }
    this.setData({ suggestions: uniq })
  },

  highlightSegs(text: string, kw: string) {
    const s = String(text || "")
    const q = String(kw || "").trim()
    if (!q) return [{ text: s, match: false }]
    const i = s.toLowerCase().indexOf(q.toLowerCase())
    if (i < 0) return [{ text: s, match: false }]
    const parts = []
    if (i > 0) parts.push({ text: s.slice(0, i), match: false })
    parts.push({ text: s.slice(i, i + q.length), match: true })
    if (i + q.length < s.length) parts.push({ text: s.slice(i + q.length), match: false })
    return parts
  },

  mapCommunityResult(r: any, kw: string) {
    return {
      id: r.id,
      title: r.title,
      summary: r.summary,
      titleSegs: this.highlightSegs(r.title, kw),
      summarySegs: this.highlightSegs(r.summary, kw),
      image: r.image,
      likes: String(r.likes ?? 0),
      comments: String(r.comments ?? 0)
    }
  },

  mapShopResult(r: any, kw: string) {
    return {
      id: r.id,
      title: r.title,
      summary: r.summary,
      titleSegs: this.highlightSegs(r.title, kw),
      summarySegs: this.highlightSegs(r.summary, kw),
      image: r.image,
      price: `¥ ${(r.price ?? 0).toFixed(2)}`
    }
  }
});
