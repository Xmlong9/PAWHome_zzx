Page({
  data: {
    petName: '涛涛',
    petAvatar: '/assets/images/home/littleface@1x.png',
    itemName: '核心疫苗（狂犬/多联）',
    storeName: 'XX宠物医院',
    date: '2024-05-20',
    time: '14:30',
    tipsTitle: '接种须知',
    tips: [] as any[]
  },

  onLoad(options: any) {
    if (options.petName) this.setData({ petName: decodeURIComponent(options.petName) });
    if (options.itemName) this.setData({ itemName: decodeURIComponent(options.itemName) });
    if (options.storeName) this.setData({ storeName: decodeURIComponent(options.storeName) });
    if (options.date) this.setData({ date: options.date });
    if (options.time) this.setData({ time: options.time });

    const type = options.type || 'vaccine';
    this.initTips(type);
  },

  initTips(type: string) {
    let tipsTitle = '服务须知';
    let tips: any[] = [];

    if (type === 'vaccine') {
      tipsTitle = '接种须知';
      tips = [
        { iconType: 'clock', text: '请提前 15 分钟到达医院' },
        { iconType: 'fork', text: '接种前 4 小时禁食' },
        { iconType: 'id', text: '请携带宠物相关证件' },
        { iconType: 'eye', text: '接种后需观察 30 分钟' }
      ];
    } else if (type === 'medical') {
      tipsTitle = '就诊须知';
      tips = [
        { iconType: 'clock', text: '请提前 15 分钟到达医院' },
        { iconType: 'fork', text: '如需抽血请提前 8 小时禁食' },
        { iconType: 'id', text: '请携带过往就诊病历' }
      ];
    } else if (type === 'beauty') {
      tipsTitle = '美容须知';
      tips = [
        { iconType: 'clock', text: '请按预约时间准时到达门店' },
        { iconType: 'fork', text: '如宠物有攻击性或皮肤病请提前告知' },
        { iconType: 'clock', text: '洗护约需 1-2 小时，请合理安排时间' }
      ];
    } else if (type === 'foster') {
      tipsTitle = '寄养须知';
      tips = [
        { iconType: 'fork', text: '请携带宠物日常口粮以防肠胃不适' },
        { iconType: 'id', text: '请携带有效疫苗本及驱虫记录' },
        { iconType: 'eye', text: '自带宠物熟悉的玩具可减轻焦虑' }
      ];
    }

    this.setData({ tipsTitle, tips });
  },

  goHome() {
    wx.switchTab({ url: '/pages/home/index' });
  },

  goOrderList() {
    wx.switchTab({ url: '/pages/my/index' });
  }
});