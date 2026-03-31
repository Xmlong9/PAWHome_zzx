import { ShopProduct, addToCart, getProductDetail, toggleFavorite } from "../../services/shop"
import { navigateBackWithTransition, navigateToWithTransitionOptions } from "../../utils/transition"

Page({
  data: {
    productId: "",
    product: null as ShopProduct | null,
    selectedSpec: "",
    quantity: 1,
    loading: true,
    safeTop: 0,
    safeBottom: 0,
    soldText: "",
    currentTab: "detail" as "detail" | "reviews" | "qa",
    detailItems: [] as Array<{ label: string; value: string }>,
    reviewTags: [] as string[],
    qaList: [] as Array<{ q: string; a: string }>
  },
  onLoad(options: Record<string, string | undefined>) {
    const productId = options.id || "p1"
    const info = wx.getSystemInfoSync()
    const safeBottom = info.safeArea ? info.screenHeight - info.safeArea.bottom : 0
    this.setData({
      productId,
      safeTop: info.statusBarHeight || 0,
      safeBottom
    })
    this.loadDetail()
  },
  async loadDetail() {
    this.setData({ loading: true })
    try {
      const product = await getProductDetail(this.data.productId)
      const nextSpec = product?.specs?.includes(this.data.selectedSpec) ? this.data.selectedSpec : product?.specs?.[0] || ""
      const meta = this.getMeta(product)
      this.setData({
        product,
        selectedSpec: nextSpec,
        soldText: this.formatSoldCount(product?.soldCount || 0),
        detailItems: meta.detailItems,
        reviewTags: meta.reviewTags,
        qaList: meta.qaList
      })
    } catch {
      wx.showToast({ title: "加载失败", icon: "none" })
    } finally {
      this.setData({ loading: false })
    }
  },
  getMeta(product: ShopProduct | null) {
    const id = product?.id || ""
    const spec = product?.specs?.[0] || ""
    const isCatFood = ["p1", "p15", "p16", "p17", "p21"].includes(id)
    const isDogFood = ["p18", "p19", "p20"].includes(id)
    const isToy = ["p4", "p6", "p9", "p10", "p12"].includes(id)
    const isBed = ["p8"].includes(id)
    const isLitterBox = ["p5"].includes(id)
    const isScratcher = ["p11"].includes(id)
    const isBrush = ["p13"].includes(id)
    const isCatHouse = ["p14"].includes(id)

    if (isCatFood) {
      return {
        detailItems: [
          { label: "适用猫龄", value: "全阶段" },
          { label: "配方特点", value: "高肉含量 · 适口性好" },
          { label: "规格", value: spec || "多规格可选" }
        ],
        reviewTags: ["适口性好", "便便稳定", "发货快"],
        qaList: [
          { q: "挑食猫能吃吗？", a: "建议先少量混粮过渡，适应后再逐步替换成主粮。" },
          { q: "开封后如何保存？", a: "建议密封避光，放在阴凉干燥处，并尽量在30天内食用完。" }
        ]
      }
    }

    if (isDogFood) {
      return {
        detailItems: [
          { label: "适用犬种", value: "中小型犬/中大型犬" },
          { label: "适用年龄", value: "成犬" },
          { label: "规格", value: spec || "多规格可选" }
        ],
        reviewTags: ["颗粒均匀", "适口性好", "物流快"],
        qaList: [
          { q: "玻璃胃狗狗能吃吗？", a: "建议先少量换粮，观察适应情况后再逐步增加。" },
          { q: "多久能看到效果？", a: "一般 7-14 天适应后更稳定，具体与个体差异有关。" }
        ]
      }
    }

    if (isLitterBox) {
      return {
        detailItems: [
          { label: "适用体重", value: "≤ 12kg" },
          { label: "核心功能", value: "大入口 · 易清理 · 减少异味" },
          { label: "版本", value: spec || "标准版/MAX版" }
        ],
        reviewTags: ["省心", "异味小", "颜值高"],
        qaList: [
          { q: "需要配合专用猫砂吗？", a: "建议使用结团型猫砂，清理效果更好。" },
          { q: "多猫家庭能用吗？", a: "支持多猫使用，建议定期清理并保持环境通风。" }
        ]
      }
    }

    if (isBed) {
      return {
        detailItems: [
          { label: "材质", value: "透气网布 · 稳固支架" },
          { label: "适用季节", value: "四季通用" },
          { label: "规格", value: spec || "M/L" }
        ],
        reviewTags: ["透气不闷", "稳固耐用", "易清洁"],
        qaList: [
          { q: "可以拆洗吗？", a: "建议按标签说明清洁，网布可擦拭或局部清洗。" },
          { q: "承重怎么样？", a: "日常家宠使用足够，建议按尺寸选择更合适。" }
        ]
      }
    }

    if (isScratcher) {
      return {
        detailItems: [
          { label: "功能", value: "抓挠 · 休息 · 躲猫" },
          { label: "材质", value: "耐磨瓦楞纸" },
          { label: "规格", value: spec || "单个/2个装" }
        ],
        reviewTags: ["耐抓", "不掉屑", "猫咪爱玩"],
        qaList: [
          { q: "会掉屑吗？", a: "正常使用会有少量纸屑，建议定期清理。" },
          { q: "能用多久？", a: "与猫咪抓挠强度有关，一般可使用数周到数月。" }
        ]
      }
    }

    if (isBrush) {
      return {
        detailItems: [
          { label: "适用毛长", value: "短毛/长毛" },
          { label: "特点", value: "加宽梳面 · 深层去毛" },
          { label: "规格", value: spec || "单把/2把装" }
        ],
        reviewTags: ["去毛干净", "手感好", "易清洁"],
        qaList: [
          { q: "敏感皮肤能用吗？", a: "建议轻柔梳理，避免用力过猛，敏感皮请先短时间试用。" },
          { q: "怎么清理梳子？", a: "梳理后取下浮毛，必要时清水冲洗并晾干。" }
        ]
      }
    }

    if (isCatHouse) {
      return {
        detailItems: [
          { label: "玩法", value: "自由DIY · 组合搭建" },
          { label: "适用", value: "玩耍 · 躲藏 · 休息" },
          { label: "规格", value: spec || "基础款/加长款" }
        ],
        reviewTags: ["好玩", "颜值高", "猫咪爱钻"],
        qaList: [
          { q: "组装复杂吗？", a: "按说明搭建即可，新手也能快速上手。" },
          { q: "能承重吗？", a: "适合日常家猫使用，建议按规格选择更稳固的组合。" }
        ]
      }
    }

    if (isToy) {
      return {
        detailItems: [
          { label: "适用", value: "解闷 · 磨牙 · 互动" },
          { label: "材质", value: "多材质组合" },
          { label: "规格", value: spec || "多规格可选" }
        ],
        reviewTags: ["耐咬", "不无聊", "性价比高"],
        qaList: [
          { q: "幼宠能用吗？", a: "建议选择更小号规格并在看护下使用。" },
          { q: "怎么清洁？", a: "可用湿巾擦拭或清水冲洗，晾干后再给宠物玩。" }
        ]
      }
    }

    return {
      detailItems: [
        { label: "说明", value: "商品信息以页面展示为准" },
        { label: "规格", value: spec || "多规格可选" },
        { label: "发货", value: "下单后 48 小时内发货" }
      ],
      reviewTags: ["发货快", "性价比高", "包装完好"],
      qaList: [
        { q: "多久发货？", a: "通常 48 小时内发货，节假日以实际为准。" },
        { q: "支持退换吗？", a: "支持 7 天无理由（未拆封未使用），具体以售后政策为准。" }
      ]
    }
  },
  chooseSpec(e: WechatMiniprogram.TouchEvent) {
    const { value } = e.currentTarget.dataset as { value: string }
    this.setData({ selectedSpec: value })
  },
  switchTab(e: WechatMiniprogram.TouchEvent) {
    const { tab } = e.currentTarget.dataset as { tab: "detail" | "reviews" | "qa" }
    this.setData({ currentTab: tab })
  },
  minusCount() {
    const next = Math.max(1, this.data.quantity - 1)
    this.setData({ quantity: next })
  },
  plusCount() {
    this.setData({ quantity: this.data.quantity + 1 })
  },
  async toggleFav() {
    if (!this.data.product) return
    await toggleFavorite(this.data.product.id)
    await this.loadDetail()
  },
  async addCart() {
    if (!this.data.product) return
    await addToCart(this.data.product.id, this.data.quantity)
    wx.showToast({ title: "已加入购物车", icon: "success" })
  },
  buyNow() {
    if (!this.data.product) return
    const id = encodeURIComponent(this.data.product.id)
    const count = this.data.quantity
    navigateToWithTransitionOptions({
      url: `/pages/shop/order/checkout?from=detail&productId=${id}&count=${count}`
    })
  },
  goCart() {
    navigateToWithTransitionOptions({ url: "/pages/cart/index" })
  },
  contactService() {
    navigateToWithTransitionOptions({ url: "/pages/shop/customer-service" })
  },
  goBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      navigateBackWithTransition()
      return
    }
    wx.switchTab({ url: "/pages/shop/index" })
  },
  formatSoldCount(value: number) {
    if (value >= 10000) {
      const count = Math.round((value / 1000)) / 10
      return `${count}w`
    }
    return String(value)
  }
})
