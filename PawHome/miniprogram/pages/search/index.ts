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

  loadResults() {
    // 模拟搜索结果
    wx.showLoading({ title: '搜索中...' });
    setTimeout(() => {
      let mockResults = [];
      if (this.data.searchType === 'community') {
        mockResults = [
          {
            id: 1,
            title: '如何让猫咪适应新环境？分享我的经验',
            summary: '刚带回家的猫咪总是躲在角落不愿意出来，教你几个实用的驯养技巧...',
            image: 'https://picsum.photos/seed/cat1/200/200',
            likes: '1.2k',
            comments: '328'
          },
          {
            id: 2,
            title: '狗狗的日常护理要点大全',
            summary: '从梳毛、洗澡到牙齿护理，让你的爱犬保持健康美丽...',
            image: 'https://picsum.photos/seed/dog1/200/200',
            likes: '856',
            comments: '234'
          },
          {
            id: 3,
            title: '兔子饲养指南：新手必看',
            summary: '详细介绍兔子的饮食、运动和日常照顾注意事项...',
            image: 'https://picsum.photos/seed/rabbit1/200/200',
            likes: '632',
            comments: '156'
          }
        ];
      } else {
        // 商店搜索 mock
        mockResults = [
          {
            id: 101,
            title: '全期全价猫粮 2.5kg 保护肠胃',
            summary: '销量 1.2w+ · 99%好评',
            image: 'https://picsum.photos/seed/food1/200/200',
            price: '¥ 128.00'
          }
        ];
      }
      
      this.setData({ results: mockResults });
      wx.hideLoading();
    }, 500);
  }
});