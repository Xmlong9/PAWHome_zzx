import { request } from "./request"
import { isMockEnabled } from "./mock"
import { getBaseUrl } from "../config/env"
import { resolveImageSrc } from "../utils/mediaCache"

export type ShopProduct = {
  id: string
  name: string
  desc: string
  price: number
  marketPrice: number
  imageUrl: string
  soldCount: number
  tags: string[]
  rating: number
  favorite: boolean
  specs: string[]
}

export type ShopCartItem = {
  productId: string
  count: number
  checked: boolean
  invalid?: boolean
}

export type ShopOrderStatus = "all" | "pending_pay" | "shipping" | "done" | "closed"

export type ShopPayType = "wx" | "alipay" | "balance"

export type ShopOrder = {
  id: string
  status: Exclude<ShopOrderStatus, "all">
  amount: number
  payType?: ShopPayType
  paidAt?: number
  createdAt: number
  productNames: string[]
  items: Array<{
    id: string
    name: string
    price: number
    imageUrl: string
    count: number
    spec: string
  }>
}

export type OrderLogistics = {
  orderId: string
  status: string
  createdAt: number
  address: { name: string; phone: string; detail: string }
  events: Array<{ type: string; at: number; text: string }>
}

export type UserAddress = {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
}

export type CheckoutPreview = {
  items: Array<{ product: ShopProduct; count: number }>
  goodsAmount: number
  freight: number
  discount: number
  payableAmount: number
}

const MOCK = () => isMockEnabled()
const STORAGE_PRODUCTS = "shop_products"
const STORAGE_CART = "shop_cart"
const STORAGE_ORDERS = "shop_orders"
const STORAGE_WALLET_TXS = "shop_wallet_txs"
const STORAGE_RECHARGE_API_DISABLED_UNTIL = "shop_recharge_api_disabled_until"
const toAbsoluteUrl = (url: string): string => {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  if (/^data:/i.test(url)) return url
  if (/^wxfile:\/\//i.test(url)) return url
  if (url.startsWith("/assets/")) return url
  const base = getBaseUrl()
  const origin = base.split("/").slice(0, 3).join("/")
  if (url.startsWith("/")) return origin + url
  return origin + "/" + url
}
const normalizeProduct = (p: ShopProduct | null): ShopProduct | null => {
  if (!p) return p
  return { ...p, imageUrl: toAbsoluteUrl(p.imageUrl) }
}
const normalizeProducts = (list: ShopProduct[]): ShopProduct[] => list.map((p) => normalizeProduct(p) as ShopProduct)

const hydrateProduct = async (p: ShopProduct | null): Promise<ShopProduct | null> => {
  const norm = normalizeProduct(p)
  if (!norm) return norm
  const nextUrl = await resolveImageSrc(norm.imageUrl)
  if (nextUrl && nextUrl !== norm.imageUrl) return { ...norm, imageUrl: nextUrl }
  return norm
}

const hydrateProducts = async (list: ShopProduct[]): Promise<ShopProduct[]> => {
  const norm = normalizeProducts(list || [])
  const hydrated = await Promise.all(norm.map((p) => hydrateProduct(p) as Promise<ShopProduct>))
  return hydrated
}
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  p1: "/assets/images/shop/商品1.jpg",
  p2: "/assets/images/shop/商品2.jpg",
  p3: "/assets/images/shop/商品3.jpg",
  p4: "/assets/images/shop/商品4.jpg",
  p5: "/media/prod_01.jpg",
  p6: "/media/prod_02.jpg",
  p7: "/media/prod_03.jpg",
  p8: "/media/prod_04.jpg",
  p9: "/media/prod_05.jpg",
  p10: "/media/prod_06.jpg",
  p11: "/media/prod_07.jpg",
  p12: "/media/prod_08.jpg",
  p13: "/media/prod_09.jpg",
  p14: "/media/prod_10.jpg",
  p15: "/media/prod_11.jpg",
  p16: "/media/prod_12.jpg",
  p17: "/media/prod_13.jpg",
  p18: "/media/prod_14.jpg",
  p19: "/media/prod_15.jpg",
  p20: "/media/prod_16.jpg",
  p21: "/media/prod_17.jpg"
}

const now = () => Date.now()

const unwrapData = <T>(input: any): T => {
  if (input && typeof input === "object" && "data" in input) return (input as any).data as T
  return input as T
}

const readJSON = <T>(key: string, fallback: T): T => {
  const value = wx.getStorageSync(key)
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const writeJSON = (key: string, value: unknown) => {
  wx.setStorageSync(key, JSON.stringify(value))
}

const seedProducts = (): ShopProduct[] => [
  {
    id: "p1",
    name: "冻干鸡肉猫粮",
    desc: "高蛋白低敏，适合挑食猫咪",
    price: 69.9,
    marketPrice: 89.9,
    imageUrl: PRODUCT_IMAGE_MAP.p1,
    soldCount: 1820,
    tags: ["热销", "冻干"],
    rating: 4.9,
    favorite: true,
    specs: ["1.5kg", "2.5kg", "5kg"]
  },
  {
    id: "p2",
    name: "益生菌猫条礼盒",
    desc: "肠胃友好，适口性强",
    price: 39.9,
    marketPrice: 59.9,
    imageUrl: PRODUCT_IMAGE_MAP.p2,
    soldCount: 960,
    tags: ["新品", "营养"],
    rating: 4.8,
    favorite: false,
    specs: ["10支", "20支", "30支"]
  },
  {
    id: "p3",
    name: "云朵猫砂 6L",
    desc: "低尘结团快，除味更持久",
    price: 29.9,
    marketPrice: 42.9,
    imageUrl: PRODUCT_IMAGE_MAP.p3,
    soldCount: 3200,
    tags: ["复购", "低尘"],
    rating: 4.7,
    favorite: false,
    specs: ["6L", "12L", "18L"]
  },
  {
    id: "p4",
    name: "猫咪逗猫棒套装",
    desc: "耐咬材质，互动不伤牙",
    price: 19.9,
    marketPrice: 29.9,
    imageUrl: PRODUCT_IMAGE_MAP.p4,
    soldCount: 1430,
    tags: ["玩具", "互动"],
    rating: 4.6,
    favorite: true,
    specs: ["经典款", "豪华款"]
  },
  {
    id: "p5",
    name: "智能自动猫砂盆 MAX",
    desc: "大入口大空间，减少异味，适合多猫家庭",
    price: 1599,
    marketPrice: 1999,
    imageUrl: PRODUCT_IMAGE_MAP.p5,
    soldCount: 230,
    tags: ["智能", "省心"],
    rating: 4.8,
    favorite: false,
    specs: ["标准版", "MAX版"]
  },
  {
    id: "p6",
    name: "狗狗玩具组合",
    desc: "磨牙解闷，快乐陪伴",
    price: 39.9,
    marketPrice: 59.9,
    imageUrl: PRODUCT_IMAGE_MAP.p6,
    soldCount: 1360,
    tags: ["磨牙", "玩具"],
    rating: 4.7,
    favorite: false,
    specs: ["8件套", "12件套"]
  },
  {
    id: "p7",
    name: "宠物零食任选 6 款",
    desc: "39元任选，多品牌混合装",
    price: 39,
    marketPrice: 49,
    imageUrl: PRODUCT_IMAGE_MAP.p7,
    soldCount: 1980,
    tags: ["零食", "任选"],
    rating: 4.7,
    favorite: false,
    specs: ["6款任选"]
  },
  {
    id: "p8",
    name: "透气防潮网眼行军床",
    desc: "透气防潮，耐磨稳固，四季可用",
    price: 129,
    marketPrice: 169,
    imageUrl: PRODUCT_IMAGE_MAP.p8,
    soldCount: 740,
    tags: ["睡窝", "透气"],
    rating: 4.6,
    favorite: false,
    specs: ["M", "L"]
  },
  {
    id: "p9",
    name: "鸭鸭安抚玩偶",
    desc: "萌宠伴侣，抱着安睡整晚",
    price: 29.9,
    marketPrice: 39.9,
    imageUrl: PRODUCT_IMAGE_MAP.p9,
    soldCount: 2180,
    tags: ["玩具", "陪伴"],
    rating: 4.6,
    favorite: false,
    specs: ["小号", "大号"]
  },
  {
    id: "p10",
    name: "联名逗猫棒套装",
    desc: "自由DIY，多种玩法，猫猫更爱玩",
    price: 29.9,
    marketPrice: 39.9,
    imageUrl: PRODUCT_IMAGE_MAP.p10,
    soldCount: 1640,
    tags: ["逗猫", "互动"],
    rating: 4.6,
    favorite: false,
    specs: ["3件套", "5件套"]
  },
  {
    id: "p11",
    name: "多功能立式猫抓板",
    desc: "玩耍/睡觉/躲猫，一板三用",
    price: 79,
    marketPrice: 109,
    imageUrl: PRODUCT_IMAGE_MAP.p11,
    soldCount: 3020,
    tags: ["猫抓板", "耐磨"],
    rating: 4.6,
    favorite: false,
    specs: ["单个", "2个装"]
  },
  {
    id: "p12",
    name: "磨牙自嗨 5 件套",
    desc: "磨牙/洁齿/自嗨，尺寸更好玩",
    price: 29.9,
    marketPrice: 39.9,
    imageUrl: PRODUCT_IMAGE_MAP.p12,
    soldCount: 1120,
    tags: ["磨牙", "玩具"],
    rating: 4.6,
    favorite: false,
    specs: ["5件套"]
  },
  {
    id: "p13",
    name: "加宽梳面去毛刷",
    desc: "加宽梳面，深层去毛，顺滑不伤皮肤",
    price: 39.9,
    marketPrice: 59.9,
    imageUrl: PRODUCT_IMAGE_MAP.p13,
    soldCount: 1860,
    tags: ["去毛", "护理"],
    rating: 4.6,
    favorite: false,
    specs: ["单把", "2把装"]
  },
  {
    id: "p14",
    name: "趣味猫窝（自由DIY）",
    desc: "多模块组合，玩耍躲藏两不误",
    price: 129,
    marketPrice: 169,
    imageUrl: PRODUCT_IMAGE_MAP.p14,
    soldCount: 960,
    tags: ["猫窝", "玩具"],
    rating: 4.7,
    favorite: false,
    specs: ["基础款", "加长款"]
  },
  {
    id: "p15",
    name: "放山鸡猫粮 2kg×4",
    desc: "高鲜肉配方，适口性更好",
    price: 154,
    marketPrice: 199,
    imageUrl: PRODUCT_IMAGE_MAP.p15,
    soldCount: 980,
    tags: ["猫粮", "主粮"],
    rating: 4.8,
    favorite: false,
    specs: ["2kg×4"]
  },
  {
    id: "p16",
    name: "Dream 美毛猫粮 1.8kg",
    desc: "21天美毛，含鱼油更亮毛",
    price: 129.9,
    marketPrice: 169.9,
    imageUrl: PRODUCT_IMAGE_MAP.p16,
    soldCount: 1240,
    tags: ["猫粮", "美毛"],
    rating: 4.7,
    favorite: false,
    specs: ["1.8kg"]
  },
  {
    id: "p17",
    name: "喵梵思蓝袋子猫粮",
    desc: "好粮不贵，口味丰富更耐吃",
    price: 89.9,
    marketPrice: 119.9,
    imageUrl: PRODUCT_IMAGE_MAP.p17,
    soldCount: 4500,
    tags: ["猫粮", "热销"],
    rating: 4.8,
    favorite: false,
    specs: ["1.8kg", "5kg"]
  },
  {
    id: "p18",
    name: "三拼狗粮 10kg",
    desc: "鸡肉拼板栗，营养搭配更均衡",
    price: 239,
    marketPrice: 299,
    imageUrl: PRODUCT_IMAGE_MAP.p18,
    soldCount: 1860,
    tags: ["狗粮", "主粮"],
    rating: 4.7,
    favorite: false,
    specs: ["10kg"]
  },
  {
    id: "p19",
    name: "鸭肉配方鲜肉狗粮",
    desc: "鲜肉配方，更好消化，适口性佳",
    price: 15.9,
    marketPrice: 22.9,
    imageUrl: PRODUCT_IMAGE_MAP.p19,
    soldCount: 2680,
    tags: ["狗粮", "鲜肉"],
    rating: 4.6,
    favorite: false,
    specs: ["800g", "2kg"]
  },
  {
    id: "p20",
    name: "N33 PLUS 鲜肉狗粮",
    desc: "鲜肉果蔬配方，营养更全面",
    price: 84.9,
    marketPrice: 109.9,
    imageUrl: PRODUCT_IMAGE_MAP.p20,
    soldCount: 1560,
    tags: ["狗粮", "鲜肉"],
    rating: 4.7,
    favorite: false,
    specs: ["2kg", "12kg"]
  },
  {
    id: "p21",
    name: "Care 全价全期猫粮",
    desc: "80%高肉含量，满足食肉天性",
    price: 99,
    marketPrice: 129,
    imageUrl: PRODUCT_IMAGE_MAP.p21,
    soldCount: 2360,
    tags: ["猫粮", "高肉"],
    rating: 4.7,
    favorite: true,
    specs: ["1.5kg", "2.5kg"]
  }
]

const seedCart = (): ShopCartItem[] => [
  { productId: "p1", count: 1, checked: true },
  { productId: "p2", count: 2, checked: true },
  { productId: "x1", count: 1, checked: false, invalid: true }
]

const seedOrders = (): ShopOrder[] => [
  {
    id: "SO10003",
    status: "pending_pay",
    amount: 77.9,
    createdAt: now() - 1 * 60 * 60 * 1000,
    productNames: ["冻干鸡肉猫粮"],
    items: [
      { id: "p1", name: "冻干鸡肉猫粮", price: 69.9, imageUrl: PRODUCT_IMAGE_MAP.p1, count: 1, spec: "1.5kg" }
    ]
  },
  {
    id: "SO10002",
    status: "pending_pay",
    amount: 109.8,
    createdAt: now() - 2 * 60 * 60 * 1000,
    productNames: ["冻干鸡肉猫粮", "益生菌猫条礼盒"],
    items: [
      { id: "p1", name: "冻干鸡肉猫粮", price: 69.9, imageUrl: PRODUCT_IMAGE_MAP.p1, count: 1, spec: "1.5kg" },
      { id: "p2", name: "益生菌猫条礼盒", price: 39.9, imageUrl: PRODUCT_IMAGE_MAP.p2, count: 1, spec: "10支" }
    ]
  },
  {
    id: "SO10001",
    status: "pending_pay",
    amount: 109.8,
    createdAt: now() - 3 * 60 * 60 * 1000,
    productNames: ["冻干鸡肉猫粮", "益生菌猫条礼盒"],
    items: [
      { id: "p1", name: "冻干鸡肉猫粮", price: 69.9, imageUrl: PRODUCT_IMAGE_MAP.p1, count: 1, spec: "1.5kg" },
      { id: "p2", name: "益生菌猫条礼盒", price: 39.9, imageUrl: PRODUCT_IMAGE_MAP.p2, count: 1, spec: "10支" }
    ]
  },
  {
    id: "SO10000",
    status: "shipping",
    amount: 69.9,
    createdAt: now() - 24 * 60 * 60 * 1000,
    productNames: ["冻干鸡肉猫粮"],
    items: [{ id: "p1", name: "冻干鸡肉猫粮", price: 69.9, imageUrl: PRODUCT_IMAGE_MAP.p1, count: 1, spec: "1.5kg" }]
  }
]

const ensureSeed = () => {
  const products = readJSON<ShopProduct[]>(STORAGE_PRODUCTS, [])
  if (!products.length) {
    writeJSON(STORAGE_PRODUCTS, seedProducts())
  } else {
    const seeded = seedProducts()
    const byId = new Map(products.map((p) => [p.id, p]))
    for (const s of seeded) {
      const existing = byId.get(s.id)
      if (existing) {
        byId.set(s.id, { ...s, ...existing, favorite: (existing as any).favorite, imageUrl: s.imageUrl })
      } else {
        byId.set(s.id, s)
      }
    }
    const next = Array.from(byId.values()).map((item) => ({
      ...item,
      imageUrl: PRODUCT_IMAGE_MAP[item.id] || item.imageUrl
    }))
    writeJSON(STORAGE_PRODUCTS, next)
  }
  const cart = readJSON<ShopCartItem[]>(STORAGE_CART, [])
  if (!cart.length) writeJSON(STORAGE_CART, seedCart())
  const orders = readJSON<ShopOrder[]>(STORAGE_ORDERS, [])
  if (!orders.length) writeJSON(STORAGE_ORDERS, seedOrders())
}

const getProductsSync = () => readJSON<ShopProduct[]>(STORAGE_PRODUCTS, [])
const setProductsSync = (list: ShopProduct[]) => writeJSON(STORAGE_PRODUCTS, list)
const getCartSync = () => readJSON<ShopCartItem[]>(STORAGE_CART, [])
const setCartSync = (list: ShopCartItem[]) => writeJSON(STORAGE_CART, list)
const getOrdersSync = () => readJSON<ShopOrder[]>(STORAGE_ORDERS, [])
const setOrdersSync = (list: ShopOrder[]) => writeJSON(STORAGE_ORDERS, list)

export type WalletTx = {
  id: string
  type: "recharge" | "pay"
  amount: number
  createdAt: number
  balanceAfter: number
  orderId?: string
}

export const getWalletBalanceSync = () => Number(wx.getStorageSync("wallet_balance") || 0)

const setWalletBalanceSync = (value: number) => {
  wx.setStorageSync("wallet_balance", Number(value.toFixed(2)))
}

const getWalletTxsSync = () => readJSON<WalletTx[]>(STORAGE_WALLET_TXS, [])

const appendWalletTxSync = (tx: WalletTx) => {
  const list = getWalletTxsSync()
  writeJSON(STORAGE_WALLET_TXS, [tx, ...list])
}

const isRechargeApiDisabled = () => {
  const until = Number(wx.getStorageSync(STORAGE_RECHARGE_API_DISABLED_UNTIL) || 0)
  return Number.isFinite(until) && until > Date.now()
}

const markRechargeApiDisabled = (ms = 60_000) => {
  wx.setStorageSync(STORAGE_RECHARGE_API_DISABLED_UNTIL, Date.now() + ms)
}

const clearRechargeApiDisabled = () => {
  wx.removeStorageSync(STORAGE_RECHARGE_API_DISABLED_UNTIL)
}

export const listAddresses = async (): Promise<UserAddress[]> => {
  if (!MOCK()) {
    const res = await request<{ list: UserAddress[] }>({ url: "/user/addresses", method: "GET" })
    return res.list || []
  }
  ensureSeed()
  return [...mockAddresses]
}

let mockAddresses: UserAddress[] = [
  {
    id: "addr_1",
    name: "张子轩",
    phone: "19510370909",
    province: "浙江省",
    city: "杭州市",
    district: "余杭区",
    detail: "杭州师范大学",
    isDefault: true
  },
  {
    id: "addr_2",
    name: "李小明",
    phone: "13800138000",
    province: "浙江省",
    city: "杭州市",
    district: "西湖区",
    detail: "文一西路888号",
    isDefault: false
  }
]

export const createAddress = async (payload: Omit<UserAddress, "id">): Promise<UserAddress> => {
  if (!MOCK()) {
    const res = await request<any>({ url: "/user/addresses", method: "POST", data: payload })
    return unwrapData<UserAddress>(res)
  }
  const created: UserAddress = { ...payload, id: `addr_${Date.now()}` }
  if (created.isDefault) {
    mockAddresses = mockAddresses.map((a) => ({ ...a, isDefault: false }))
  }
  mockAddresses = [created, ...mockAddresses]
  return created
}

export const updateAddress = async (id: string, payload: Partial<Omit<UserAddress, "id">>): Promise<UserAddress> => {
  if (!MOCK()) {
    const res = await request<any>({ url: `/user/addresses/${encodeURIComponent(id)}`, method: "PUT", data: payload })
    return unwrapData<UserAddress>(res)
  }
  const idx = mockAddresses.findIndex((a) => a.id === id)
  if (idx === -1) throw new Error("address not found")
  const next = { ...mockAddresses[idx], ...payload } as UserAddress
  if (next.isDefault) {
    mockAddresses = mockAddresses.map((a) => ({ ...a, isDefault: a.id === id }))
  } else {
    mockAddresses[idx] = next
  }
  mockAddresses = mockAddresses.map((a) => (a.id === id ? next : a))
  return next
}

export const deleteAddress = async (id: string): Promise<{ ok: boolean }> => {
  if (!MOCK()) {
    const res = await request<any>({ url: `/user/addresses/${encodeURIComponent(id)}`, method: "DELETE" })
    const out = unwrapData<{ ok?: boolean }>(res)
    return { ok: out?.ok !== false }
  }
  mockAddresses = mockAddresses.filter((a) => a.id !== id)
  if (!mockAddresses.some((a) => a.isDefault) && mockAddresses[0]) {
    mockAddresses[0] = { ...mockAddresses[0], isDefault: true }
  }
  return { ok: true }
}

export const setDefaultAddress = async (id: string): Promise<{ ok: boolean }> => {
  if (!MOCK()) {
    const res = await request<any>({ url: "/user/address/default", method: "PUT", data: { id } })
    const out = unwrapData<{ ok?: boolean }>(res)
    return { ok: out?.ok !== false }
  }
  mockAddresses = mockAddresses.map((a) => ({ ...a, isDefault: a.id === id }))
  return { ok: true }
}

export const getAddressById = async (id: string): Promise<UserAddress | null> => {
  const list = await listAddresses()
  return list.find((a) => a.id === id) || null
}

export const getDefaultAddress = async (): Promise<UserAddress | null> => {
  if (!MOCK()) {
    const res = await request<any>({ url: "/user/address/default", method: "GET" })
    return unwrapData<UserAddress | null>(res) || null
  }
  ensureSeed()
  return mockAddresses.find((a) => a.isDefault) || mockAddresses[0] || null
}

export const listProducts = async (): Promise<ShopProduct[]> => {
  if (!MOCK()) {
    const res = await request<{ list: ShopProduct[] }>({ url: "/shop/products", method: "GET" })
    return hydrateProducts(res.list || [])
  }
  ensureSeed()
  return hydrateProducts(getProductsSync())
}

export const getProductDetail = async (id: string): Promise<ShopProduct | null> => {
  if (!MOCK()) {
    const p = await request<ShopProduct>({ url: `/shop/products/${encodeURIComponent(id)}`, method: "GET" })
    return hydrateProduct(p)
  }
  ensureSeed()
  const product = getProductsSync().find((item) => item.id === id)
  return hydrateProduct(product || null)
}

export const listFavorites = async (): Promise<ShopProduct[]> => {
  if (!MOCK()) {
    const res = await request<{ list: ShopProduct[] }>({ url: "/shop/favorites", method: "GET" })
    return hydrateProducts(res.list || [])
  }
  ensureSeed()
  return hydrateProducts(getProductsSync().filter((item) => item.favorite))
}

export const toggleFavorite = async (productId: string): Promise<boolean> => {
  if (!MOCK()) {
    const res = await request<{ favorite: boolean }>({ url: `/shop/favorites/${encodeURIComponent(productId)}`, method: "POST" })
    return !!res.favorite
  }
  ensureSeed()
  const products = getProductsSync()
  const next = products.map((item) => (item.id === productId ? { ...item, favorite: !item.favorite } : item))
  setProductsSync(next)
  return !!next.find((item) => item.id === productId)?.favorite
}

export const listCartItems = async (): Promise<Array<{ product: ShopProduct | null; count: number; checked: boolean; invalid?: boolean }>> => {
  if (!MOCK()) {
    const res = await request<{ list: Array<{ product: ShopProduct | null; count: number; checked: boolean; invalid?: boolean }> }>({ url: "/shop/cart", method: "GET" })
    const list = res.list || []
    const hydrated = await Promise.all(
      list.map(async (x) => ({ ...x, product: await hydrateProduct(x.product) }))
    )
    return hydrated
  }
  ensureSeed()
  const products = getProductsSync()
  const base = getCartSync().map((cartItem) => ({
    product: products.find((p) => p.id === cartItem.productId) || null,
    count: cartItem.count,
    checked: cartItem.checked,
    invalid: cartItem.invalid
  }))
  const hydrated = await Promise.all(base.map(async (x) => ({ ...x, product: await hydrateProduct(x.product) })))
  return hydrated
}

export const addToCart = async (productId: string, count = 1): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: "/shop/cart", method: "POST", data: { productId, count } })
    return
  }
  ensureSeed()
  const cart = getCartSync()
  const found = cart.find((item) => item.productId === productId && !item.invalid)
  if (found) {
    found.count += count
  } else {
    cart.push({ productId, count, checked: true })
  }
  setCartSync(cart)
}

export const updateCartItem = async (productId: string, payload: { count?: number; checked?: boolean }): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: `/shop/cart/${encodeURIComponent(productId)}`, method: "PATCH", data: payload })
    return
  }
  ensureSeed()
  const cart = getCartSync()
  const next = cart.map((item) => {
    if (item.productId !== productId || item.invalid) return item
    const count = payload.count !== undefined ? Math.max(1, payload.count) : item.count
    const checked = payload.checked !== undefined ? payload.checked : item.checked
    return { ...item, count, checked }
  })
  setCartSync(next)
}

export const setAllCartChecked = async (checked: boolean): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: "/shop/cart/check-all", method: "POST", data: { checked } })
    return
  }
  ensureSeed()
  const cart = getCartSync()
  setCartSync(cart.map((item) => (item.invalid ? item : { ...item, checked })))
}

export const clearInvalidCartItems = async (): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: "/shop/cart/invalid", method: "DELETE" })
    return
  }
  ensureSeed()
  setCartSync(getCartSync().filter((item) => !item.invalid))
}

export const buildCheckoutPreview = async (params: { from: "cart" | "detail"; productId?: string; count?: number }): Promise<CheckoutPreview> => {
  if (!MOCK()) {
    const res = await request<CheckoutPreview>({ url: "/shop/order/preview", method: "POST", data: params })
    const items = await Promise.all(
      (res.items || []).map(async (it) => ({
        ...it,
        product: (await hydrateProduct(it.product)) as ShopProduct
      }))
    )
    return { ...res, items }
  }
  ensureSeed()
  const products = getProductsSync()
  const list = params.from === "detail"
    ? (() => {
      const product = products.find((item) => item.id === params.productId)
      if (!product) return []
      return [{ product, count: Math.max(1, params.count || 1) }]
    })()
    : getCartSync()
      .filter((item) => item.checked && !item.invalid)
      .map((item) => {
        const product = products.find((p) => p.id === item.productId)
        return product ? { product, count: item.count } : null
      })
      .filter((item): item is { product: ShopProduct; count: number } => !!item)
  const goodsAmount = Number(list.reduce((sum, item) => sum + item.product.price * item.count, 0).toFixed(2))
  const freight = goodsAmount >= 99 || goodsAmount === 0 ? 0 : 8
  const discount = goodsAmount >= 200 ? 20 : 0
  const payableAmount = Number((goodsAmount + freight - discount).toFixed(2))
  return { items: list, goodsAmount, freight, discount, payableAmount }
}

export const submitOrder = async (params: { from: "cart" | "detail"; productId?: string; count?: number; address: string; payType: "wx" | "alipay" | "balance" }): Promise<ShopOrder> => {
  if (!MOCK()) {
    return await request<ShopOrder>({ url: "/shop/order", method: "POST", data: params })
  }
  ensureSeed()
  const preview = await buildCheckoutPreview({ from: params.from, productId: params.productId, count: params.count })
  const order: ShopOrder = {
    id: `SO${Math.floor(now() / 1000)}`,
    status: "pending_pay",
    amount: preview.payableAmount,
    payType: params.payType,
    createdAt: now(),
    productNames: preview.items.map((item) => item.product.name),
    items: preview.items.map((item) => ({
      id: item.product.id,
      name: item.product.name,
      price: item.product.price,
      imageUrl: item.product.imageUrl,
      count: item.count,
      spec: item.product.specs[0] || "默认"
    }))
  }
  const orders = getOrdersSync()
  setOrdersSync([order, ...orders])
  if (params.from === "cart") {
    const cart = getCartSync()
    setCartSync(cart.filter((item) => item.invalid || !item.checked))
  }
  return order
}

export const deleteOrder = async (id: string): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: `/shop/orders/${encodeURIComponent(id)}`, method: "DELETE" })
    return
  }
  ensureSeed()
  const orders = getOrdersSync()
  setOrdersSync(orders.filter((o) => o.id !== id))
}

export const confirmOrderReceipt = async (id: string): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: `/shop/orders/${encodeURIComponent(id)}/confirm-receipt`, method: "POST" })
    return
  }
  ensureSeed()
  const orders = getOrdersSync()
  setOrdersSync(
    orders.map((o) => {
      if (o.id === id) {
        return { ...o, status: "done" }
      }
      return o
    })
  )
}

export const payOrderMock = async (id: string): Promise<void> => {
  if (!MOCK()) {
    await request<void>({ url: `/shop/orders/${encodeURIComponent(id)}/pay`, method: "POST" })
    return
  }
  ensureSeed()
  const orders = getOrdersSync()
  const target = orders.find((o) => o.id === id)
  if (!target) throw new Error("ORDER_NOT_FOUND")
  if (target.status !== "pending_pay") return
  const payType: ShopPayType = target.payType || "wx"
  if (payType === "balance") {
    const current = getWalletBalanceSync()
    if (current + 1e-9 < target.amount) throw new Error("INSUFFICIENT_BALANCE")
    const nextBalance = Number((current - target.amount).toFixed(2))
    setWalletBalanceSync(nextBalance)
    appendWalletTxSync({
      id: `wtx_${now()}`,
      type: "pay",
      amount: target.amount,
      createdAt: now(),
      balanceAfter: nextBalance,
      orderId: id
    })
  }
  setOrdersSync(
    orders.map((o) => {
      if (o.id === id) {
        return { ...o, status: "shipping", paidAt: now() }
      }
      return o
    })
  )
}

export const getOrderLogistics = async (orderId: string): Promise<OrderLogistics> => {
  if (!MOCK()) {
    return await request<OrderLogistics>({ url: `/shop/orders/${encodeURIComponent(orderId)}/logistics`, method: "GET" })
  }
  ensureSeed()
  const o = getOrdersSync().find((x) => x.id === orderId) || getOrdersSync()[0]
  const createdAt = o?.createdAt || now()
  const events: Array<{ type: string; at: number; text: string }> = [{ type: "created", at: createdAt, text: "订单已创建" }]
  if (o?.status === "shipping" || o?.status === "done") {
    events.unshift({ type: "shipped", at: createdAt + 2 * 60 * 1000, text: "商家已发货" })
    events.unshift({ type: "out_for_delivery", at: createdAt + 40 * 60 * 1000, text: "快件派送中" })
  }
  if (o?.status === "done") {
    events.unshift({ type: "signed", at: createdAt + 2 * 60 * 60 * 1000, text: "已签收" })
  }
  return {
    orderId: o?.id || orderId,
    status: o?.status || "pending_pay",
    createdAt,
    address: { name: "收货人", phone: "******", detail: "请在非 Mock 环境查看真实地址" },
    events: events.sort((a, b) => b.at - a.at)
  }
}

export const listOrders = async (status: ShopOrderStatus): Promise<ShopOrder[]> => {
  if (!MOCK()) {
    const res = await request<{ list: ShopOrder[] }>({ url: "/shop/orders", method: "GET", data: { status } })
    const list = res.list || []
    const hydrated = await Promise.all(
      list.map(async (o) => {
        const items = Array.isArray(o.items) ? o.items : []
        const nextItems = await Promise.all(
          items.map(async (it) => ({
            ...it,
            imageUrl: await resolveImageSrc(toAbsoluteUrl(String(it.imageUrl || "")))
          }))
        )
        return { ...o, items: nextItems }
      })
    )
    return hydrated
  }
  ensureSeed()
  const list = getOrdersSync()
  if (status === "all") return list
  return list.filter((item) => item.status === status)
}

export const listRechargeOptions = async (): Promise<Array<{ id: string; amount: number; bonus: number }>> => {
  if (!MOCK()) {
    if (isRechargeApiDisabled()) return [...fallbackRechargeOptions]
    try {
      const res = await request<{ list: Array<{ id: string; amount: number; bonus: number }> }>({ url: "/shop/recharge/options", method: "GET" })
      const list = res.list || []
      clearRechargeApiDisabled()
      return list.length ? list : [...fallbackRechargeOptions]
    } catch (error) {
      const statusCode = (error as any)?.statusCode as number | undefined
      if (statusCode === 404) markRechargeApiDisabled()
      return [...fallbackRechargeOptions]
    }
  }
  return [...fallbackRechargeOptions]
}

export const submitRecharge = async (optionId: string): Promise<{ balance: number }> => {
  if (!MOCK()) {
    if (isRechargeApiDisabled()) return await submitRechargeMock(optionId)
    try {
      const res = await request<{ balance: number }>({ url: "/shop/recharge", method: "POST", data: { optionId } })
      clearRechargeApiDisabled()
      return res
    } catch (error) {
      const statusCode = (error as any)?.statusCode as number | undefined
      const msg = (error as any)?.message as string | undefined
      const is404 = statusCode === 404 || (typeof msg === "string" && msg.includes("404"))
      if (!is404) throw error
      markRechargeApiDisabled()
      return await submitRechargeMock(optionId)
    }
  }
  return await submitRechargeMock(optionId)
}

const fallbackRechargeOptions: Array<{ id: string; amount: number; bonus: number }> = [
  { id: "r1", amount: 30, bonus: 0 },
  { id: "r2", amount: 68, bonus: 8 },
  { id: "r3", amount: 128, bonus: 20 },
  { id: "r4", amount: 328, bonus: 68 }
]

const submitRechargeMock = async (optionId: string): Promise<{ balance: number }> => {
  const options = await listRechargeOptions()
  const option = options.find((item) => item.id === optionId)
  const current = getWalletBalanceSync()
  const value = option ? option.amount + option.bonus : 0
  const balance = Number((current + value).toFixed(2))
  setWalletBalanceSync(balance)
  appendWalletTxSync({
    id: `wtx_${now()}`,
    type: "recharge",
    amount: Number(value.toFixed(2)),
    createdAt: now(),
    balanceAfter: balance
  })
  return { balance }
}

export const listFaqs = async (): Promise<Array<{ id: string; q: string; a: string }>> => {
  if (!MOCK()) {
    const res = await request<{ list: Array<{ id: string; q: string; a: string }> }>({ url: "/shop/customer-service/faqs", method: "GET" })
    return res.list || []
  }
  return [
    { id: "f1", q: "发货多久能到？", a: "常规地区 48 小时内发出，偏远地区以物流信息为准。" },
    { id: "f2", q: "支持7天无理由吗？", a: "未拆封且不影响二次销售的商品可申请。" },
    { id: "f3", q: "猫粮吃不惯怎么办？", a: "建议7天换粮法逐步替换，仍不适应可联系客服处理。" }
  ]
}
