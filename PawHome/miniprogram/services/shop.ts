import { request } from "./request"
import { isMockEnabled } from "./mock"

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

export type ShopOrder = {
  id: string
  status: Exclude<ShopOrderStatus, "all">
  amount: number
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
const PRODUCT_IMAGE_MAP: Record<string, string> = {
  p1: "/assets/images/shop/商品1.jpg",
  p2: "/assets/images/shop/商品2.jpg",
  p3: "/assets/images/shop/商品3.jpg",
  p4: "/assets/images/shop/商品4.jpg"
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
    const next = products.map((item) => ({
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
    return res.list || []
  }
  ensureSeed()
  return getProductsSync()
}

export const getProductDetail = async (id: string): Promise<ShopProduct | null> => {
  if (!MOCK()) {
    return await request<ShopProduct>({ url: `/shop/products/${encodeURIComponent(id)}`, method: "GET" })
  }
  ensureSeed()
  const product = getProductsSync().find((item) => item.id === id)
  return product || null
}

export const listFavorites = async (): Promise<ShopProduct[]> => {
  if (!MOCK()) {
    const res = await request<{ list: ShopProduct[] }>({ url: "/shop/favorites", method: "GET" })
    return res.list || []
  }
  ensureSeed()
  return getProductsSync().filter((item) => item.favorite)
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
    return res.list || []
  }
  ensureSeed()
  const products = getProductsSync()
  return getCartSync().map((cartItem) => ({
    product: products.find((p) => p.id === cartItem.productId) || null,
    count: cartItem.count,
    checked: cartItem.checked,
    invalid: cartItem.invalid
  }))
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
    return await request<CheckoutPreview>({ url: "/shop/order/preview", method: "POST", data: params })
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
  setOrdersSync(
    orders.map((o) => {
      if (o.id === id) {
        return { ...o, status: "shipping" }
      }
      return o
    })
  )
}

export const listOrders = async (status: ShopOrderStatus): Promise<ShopOrder[]> => {
  if (!MOCK()) {
    const res = await request<{ list: ShopOrder[] }>({ url: "/shop/orders", method: "GET", data: { status } })
    return res.list || []
  }
  ensureSeed()
  const list = getOrdersSync()
  if (status === "all") return list
  return list.filter((item) => item.status === status)
}

export const listRechargeOptions = async (): Promise<Array<{ id: string; amount: number; bonus: number }>> => {
  if (!MOCK()) {
    const res = await request<{ list: Array<{ id: string; amount: number; bonus: number }> }>({ url: "/shop/recharge/options", method: "GET" })
    return res.list || []
  }
  return [
    { id: "r1", amount: 30, bonus: 0 },
    { id: "r2", amount: 68, bonus: 8 },
    { id: "r3", amount: 128, bonus: 20 },
    { id: "r4", amount: 328, bonus: 68 }
  ]
}

export const submitRecharge = async (optionId: string): Promise<{ balance: number }> => {
  if (!MOCK()) {
    return await request<{ balance: number }>({ url: "/shop/recharge", method: "POST", data: { optionId } })
  }
  const option = (await listRechargeOptions()).find((item) => item.id === optionId)
  const current = Number(wx.getStorageSync("wallet_balance") || 0)
  const value = option ? option.amount + option.bonus : 0
  const balance = Number((current + value).toFixed(2))
  wx.setStorageSync("wallet_balance", balance)
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
