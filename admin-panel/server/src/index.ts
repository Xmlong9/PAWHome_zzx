import express from 'express'
import cors from 'cors'
import { env } from './env'
import { migrate } from './migrate'
import { seed } from './seed'
import { getDb } from './db'
import bcrypt from 'bcryptjs'
import { signAdminToken, verifyAdminToken } from './auth'
import { randomUUID } from 'crypto'

type ApiResponse<T> = { ok: true; code: 0; data: T } | { ok: false; code: number; message: string }

function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, code: 0, data }
}

function fail(code: number, message: string): ApiResponse<never> {
  return { ok: false, code, message }
}

function maskPhone(phone?: string | null) {
  if (!phone) return ''
  if (phone.length < 7) return phone
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function formatCents(cents: number) {
  return Math.round(cents) / 100
}

async function writeAuditLog(params: {
  adminId?: number
  module: string
  action: string
  ip?: string
  userAgent?: string
}) {
  const db = await getDb()
  const serialNo = `LOG-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.floor(Math.random() * 900 + 100)}`
  await db.run(
    `INSERT INTO audit_logs (serial_no, admin_id, module, action, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)`
    , [serialNo, params.adminId ?? null, params.module, params.action, params.ip ?? null, params.userAgent ?? null]
  )
}

async function main() {
  await migrate()
  await seed()

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/v1/health', (_req, res) => {
    res.json(ok({ status: 'ok' }))
  })

  app.post('/api/v1/admin/auth/login', async (req, res) => {
    const { username, password } = req.body || {}
    if (!username || !password) {
      res.status(400).json(fail(400, '用户名或密码不能为空'))
      return
    }

    const db = await getDb()
    const admin = await db.get<{
      id: number
      username: string
      name: string
      phone: string | null
      role: string
      password_hash: string
      status: string
    }>(`SELECT * FROM admins WHERE username = ?`, [String(username)])

    if (!admin) {
      res.status(401).json(fail(401, '用户名或密码错误'))
      return
    }

    if (admin.status !== 'active') {
      res.status(403).json(fail(403, '账号已禁用'))
      return
    }

    const okPwd = await bcrypt.compare(String(password), admin.password_hash)
    if (!okPwd) {
      res.status(401).json(fail(401, '用户名或密码错误'))
      return
    }

    const token = signAdminToken({
      sub: String(admin.id),
      username: admin.username,
      name: admin.name
    })

    await db.run(`UPDATE admins SET last_login_at = datetime('now') WHERE id = ?`, [admin.id])
    await writeAuditLog({
      adminId: admin.id,
      module: '账户安全',
      action: '管理员登录',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined
    })

    res.json(
      ok({
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          name: admin.name,
          phone: admin.phone,
          role: admin.role
        }
      })
    )
  })

  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      res.status(401).json(fail(401, '未登录'))
      return
    }
    try {
      const payload = verifyAdminToken(token)
      ;(req as any).adminJwt = payload
      next()
    } catch {
      res.status(401).json(fail(401, '登录已过期'))
    }
  }

  app.post('/api/v1/admin/auth/logout', requireAuth, async (req, res) => {
    const jwtPayload = (req as any).adminJwt as { sub: string } | undefined
    await writeAuditLog({
      adminId: jwtPayload ? Number(jwtPayload.sub) : undefined,
      module: '账户安全',
      action: '管理员退出登录',
      ip: req.ip,
      userAgent: req.get('user-agent') || undefined
    })
    res.json(ok({}))
  })

  app.get('/api/v1/admin/dashboard/overview', requireAuth, async (_req, res) => {
    const db = await getDb()

    const userCount = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM users'))?.cnt || 0
    const postCount = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM posts'))?.cnt || 0
    const orderCount = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM orders'))?.cnt || 0
    const revenueCents = (await db.get<{ sum: number }>('SELECT COALESCE(SUM(amount_paid_cents),0) as sum FROM orders'))?.sum || 0

    res.json(
      ok({
        userCount,
        postCount,
        orderCount,
        revenue: formatCents(revenueCents)
      })
    )
  })

  app.get('/api/v1/admin/dashboard/stats', requireAuth, async (req, res) => {
    const db = await getDb()

    // Aggregate user stats
    const todayNewUsers = (await db.get<{ cnt: number }>(`
      SELECT COUNT(1) as cnt 
      FROM users 
      WHERE date(registered_at) = date('now')
    `))?.cnt || 0

    const activeUsersRes = await db.get<{ cnt: number }>(`
      SELECT COUNT(1) as cnt FROM (
        SELECT u.id
        FROM users u
        WHERE (SELECT COUNT(1) FROM posts WHERE author_user_id = u.id) +
              (SELECT COUNT(1) FROM comments WHERE author_user_id = u.id) +
              (SELECT COALESCE(SUM(like_count), 0) FROM posts WHERE author_user_id = u.id) +
              (SELECT COALESCE(SUM(like_count), 0) FROM comments WHERE author_user_id = u.id) > 0
      )
    `)
    const activeUsersCount = activeUsersRes?.cnt || 0

    const seriousOwnersRes = await db.get<{ cnt: number }>(`
      SELECT COUNT(1) as cnt FROM (
        SELECT u.id
        FROM users u
        WHERE (SELECT COUNT(1) FROM pets WHERE user_id = u.id) > 0
      )
    `)
    const seriousOwnersCount = seriousOwnersRes?.cnt || 0

    const bannedRes = await db.get<{ cnt: number }>(`
      SELECT COUNT(1) as cnt FROM users WHERE status = 'banned'
    `)
    const bannedCount = bannedRes?.cnt || 0

    // Other simple mocks
    res.json(
      ok({
        users: { 
          today: todayNewUsers,
          active: activeUsersCount,
          certified: seriousOwnersCount,
          banned: bannedCount
        },
        posts: { today: 24 },
        charts: {
          contentFormDistribution: [
            { name: '图文', value: 15 },
            { name: '视频', value: 5 },
            { name: '纯文本', value: 4 }
          ],
          likesTrend: [10, 15, 8, 20, 25, 40, 50],
          commentsTrend: [5, 8, 3, 10, 15, 20, 30]
        }
      })
    )
  })

  function parsePage(req: express.Request) {
    const page = Math.max(1, Number(req.query.page || 1))
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 10)))
    const offset = (page - 1) * pageSize
    return { page, pageSize, offset }
  }

  app.get('/api/v1/admin/users', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM users'))?.cnt || 0

    const rows = await db.all<{
      id: string
      nickname: string
      phone: string | null
      gender: string
      avatar_url: string | null
      status: string
      registered_at: string
      post_count: number
      comment_count: number
      like_count: number
      pet_count: number
    }>(
      `SELECT u.id, u.nickname, u.phone, u.gender, u.avatar_url, u.status, u.registered_at,
              (SELECT COUNT(1) FROM posts WHERE author_user_id = u.id) as post_count,
              (SELECT COUNT(1) FROM comments WHERE author_user_id = u.id) as comment_count,
              (SELECT COALESCE(SUM(like_count), 0) FROM posts WHERE author_user_id = u.id) + 
              (SELECT COALESCE(SUM(like_count), 0) FROM comments WHERE author_user_id = u.id) as like_count,
              (SELECT COUNT(1) FROM pets WHERE user_id = u.id) as pet_count
       FROM users u
       ORDER BY u.registered_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )

    res.json(
      ok({
        items: rows.map((u) => {
          const activeScore = u.post_count + u.comment_count + u.like_count
          const isActive = activeScore > 0
          const isSeriousOwner = u.pet_count > 0
          
          return {
            id: u.id,
            nickname: u.nickname,
            phone: u.phone,
            phoneMasked: maskPhone(u.phone),
            gender: u.gender,
            avatarUrl: u.avatar_url,
            status: u.status,
            registeredAt: u.registered_at,
            tags: {
              isActive,
              isSeriousOwner
            }
          }
        }),
        page,
        pageSize,
        total
      })
    )
  })

  app.put('/api/v1/admin/users/:id', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    const { nickname, phone, gender } = req.body
    
    await db.run(
      `UPDATE users SET nickname = ?, phone = ?, gender = ? WHERE id = ?`,
      [nickname, phone, gender, id]
    )
    
    res.json(ok({}))
  })

  app.put('/api/v1/admin/users/:id/status', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    const { status } = req.body
    
    await db.run(`UPDATE users SET status = ? WHERE id = ?`, [status, id])
    res.json(ok({}))
  })

  app.get('/api/v1/admin/content/posts', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM posts'))?.cnt || 0
    const rows = await db.all<{
      id: string
      content_preview: string
      text_type: string
      image_count: number
      video_count: number
      like_count: number
      comment_count: number
      published_at: string
      author_user_id: string
      author_nickname: string
      author_avatar_url: string | null
    }>(
      `SELECT p.id, p.content_preview, p.text_type, p.image_count, p.video_count, p.like_count, p.comment_count, p.published_at,
              u.id as author_user_id, u.nickname as author_nickname, u.avatar_url as author_avatar_url
       FROM posts p
       JOIN users u ON u.id = p.author_user_id
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )

    res.json(
      ok({
        items: rows.map((r) => ({
          id: r.id,
          author: { id: r.author_user_id, name: r.author_nickname, avatarUrl: r.author_avatar_url },
          contentPreview: r.content_preview,
          mediaStats: { imageCount: r.image_count, videoCount: r.video_count, textType: r.text_type },
          engagement: { likeCount: r.like_count, commentCount: r.comment_count },
          publishedAt: r.published_at
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.put('/api/v1/admin/posts/:id', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    const { contentPreview } = req.body
    
    await db.run(
      `UPDATE posts SET content_preview = ? WHERE id = ?`,
      [contentPreview, id]
    )
    
    res.json(ok({}))
  })

  app.delete('/api/v1/admin/posts/:id', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    
    await db.run(`DELETE FROM comments WHERE post_id = ?`, [id])
    await db.run(`DELETE FROM posts WHERE id = ?`, [id])
    
    res.json(ok({}))
  })

  app.get('/api/v1/admin/content/comments', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM comments'))?.cnt || 0
    const rows = await db.all<{
      id: string
      content: string
      like_count: number
      status: string
      created_at: string
      author_user_id: string
      author_nickname: string
      author_avatar_url: string | null
      post_id: string
      post_preview: string
    }>(
      `SELECT c.id, c.content, c.like_count, c.status, c.created_at,
              u.id as author_user_id, u.nickname as author_nickname, u.avatar_url as author_avatar_url,
              p.id as post_id, p.content_preview as post_preview
       FROM comments c
       JOIN users u ON u.id = c.author_user_id
       JOIN posts p ON p.id = c.post_id
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )

    res.json(
      ok({
        items: rows.map((r) => ({
          id: r.id,
          user: { id: r.author_user_id, name: r.author_nickname, avatarUrl: r.author_avatar_url, levelText: 'Lv.5 资深铲屎官' },
          post: { id: r.post_id, title: r.post_preview },
          content: r.content,
          likeCount: r.like_count,
          status: r.status,
          createdAt: r.created_at
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.delete('/api/v1/admin/comments/:id', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    
    await db.run(`DELETE FROM comments WHERE id = ?`, [id])
    
    res.json(ok({}))
  })

  app.get('/api/v1/admin/shop/products', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM products'))?.cnt || 0
    const rows = await db.all<{
      id: string
      product_no: string
      name: string
      category_text: string | null
      price_cents: number
      stock_qty: number
      status: string
      image_url: string | null
      created_at: string
    }>(
      `SELECT id, product_no, name, category_text, price_cents, stock_qty, status, image_url, created_at
       FROM products
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )

    res.json(
      ok({
        items: rows.map((r) => ({
          id: r.id,
          productNo: r.product_no,
          name: r.name,
          categoryText: r.category_text,
          price: formatCents(r.price_cents),
          stockQty: r.stock_qty,
          status: r.status,
          isActive: r.status !== 'off_sale',
          imageUrl: r.image_url,
          createdAt: r.created_at
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.get('/api/v1/admin/shop/products/summary', requireAuth, async (_req, res) => {
    const db = await getDb()
    const summary = await db.get<{
      total: number
      active: number
      low_stock: number
      out_of_stock: number
      total_stock_qty: number
      total_stock_value_cents: number
    }>(`
      SELECT 
        COUNT(1) as total,
        SUM(CASE WHEN status != 'off_sale' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'low_stock' THEN 1 ELSE 0 END) as low_stock,
        SUM(CASE WHEN stock_qty = 0 THEN 1 ELSE 0 END) as out_of_stock,
        SUM(stock_qty) as total_stock_qty,
        SUM(stock_qty * price_cents) as total_stock_value_cents
      FROM products
    `)

    // Simple estimation for this month's new products
    const monthNew = await db.get<{ cnt: number }>(`
      SELECT COUNT(1) as cnt 
      FROM products 
      WHERE created_at >= datetime('now', 'start of month')
    `)

    res.json(ok({
      totalProducts: summary?.total || 0,
      activeProducts: summary?.active || 0,
      monthNewProducts: monthNew?.cnt || 0,
      outOfStockProducts: summary?.out_of_stock || 0,
      totalStockQty: summary?.total_stock_qty || 0,
      totalStockValue: summary?.total_stock_value_cents ? summary.total_stock_value_cents / 100 : 0
    }))
  })

  app.post('/api/v1/admin/shop/products', requireAuth, async (req, res) => {
    const db = await getDb()
    const { title, price_cents, stock, images_json, is_active } = req.body
    
    let images: string[] = []
    try {
      images = JSON.parse(images_json)
    } catch {
      images = []
    }
    const imageUrl = images[0] || null

    const status = !is_active ? 'off_sale' : (stock === 0 ? 'off_sale' : (stock < 100 ? 'low_stock' : 'on_sale'))
    const productNo = 'P' + Date.now() + Math.floor(Math.random() * 1000)

    const id = crypto.randomUUID()
    await db.run(
      `INSERT INTO products (id, product_no, name, price_cents, stock_qty, status, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, productNo, title, price_cents, stock, status, imageUrl]
    )

    res.json(ok({ id }))
  })

  app.put('/api/v1/admin/shop/products/:id', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    const { title, price_cents, stock, images_json, is_active } = req.body
    
    let images: string[] = []
    try {
      images = JSON.parse(images_json)
    } catch {
      images = []
    }
    const imageUrl = images[0] || null

    const status = !is_active ? 'off_sale' : (stock === 0 ? 'off_sale' : (stock < 100 ? 'low_stock' : 'on_sale'))

    await db.run(
      `UPDATE products 
       SET name = ?, price_cents = ?, stock_qty = ?, status = ?, image_url = ?
       WHERE id = ?`,
      [title, price_cents, stock, status, imageUrl, id]
    )

    res.json(ok({}))
  })

  app.put('/api/v1/admin/shop/products/:id/status', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    const { is_active } = req.body

    const product = await db.get<{ stock_qty: number }>('SELECT stock_qty FROM products WHERE id = ?', [id])
    if (!product) {
      return res.status(404).json(fail(404, '商品不存在'))
    }

    const status = !is_active ? 'off_sale' : (product.stock_qty === 0 ? 'off_sale' : (product.stock_qty < 100 ? 'low_stock' : 'on_sale'))

    await db.run('UPDATE products SET status = ? WHERE id = ?', [status, id])

    res.json(ok({}))
  })

  app.post('/api/v1/admin/shop/products/batch-status', requireAuth, async (req, res) => {
    const db = await getDb()
    const { ids, is_active } = req.body
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json(ok({}))
    }

    const placeholders = ids.map(() => '?').join(',')
    
    if (!is_active) {
      await db.run(`UPDATE products SET status = 'off_sale' WHERE id IN (${placeholders})`, ids)
    } else {
      // Need to set to 'on_sale' or 'low_stock' based on stock_qty
      await db.run(`
        UPDATE products 
        SET status = CASE 
          WHEN stock_qty = 0 THEN 'off_sale' 
          WHEN stock_qty < 100 THEN 'low_stock' 
          ELSE 'on_sale' 
        END
        WHERE id IN (${placeholders})
      `, ids)
    }

    res.json(ok({}))
  })

  app.delete('/api/v1/admin/shop/products/:id', requireAuth, async (req, res) => {
    const db = await getDb()
    const { id } = req.params
    
    // check if it's used in order_items
    const used = await db.get('SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1', [id])
    if (used) {
      return res.status(400).json(fail(400, '商品已有订单记录，不能删除，请使用下架功能'))
    }

    await db.run('DELETE FROM products WHERE id = ?', [id])
    res.json(ok({}))
  })

  app.get('/api/v1/admin/shop/orders', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const { q, name, status } = req.query

    let whereSql = '1=1'
    const whereArgs: any[] = []

    if (q) {
      whereSql += ' AND (o.order_no LIKE ? OR u.phone LIKE ?)'
      whereArgs.push(`%${q}%`, `%${q}%`)
    }
    if (name) {
      whereSql += ' AND u.nickname LIKE ?'
      whereArgs.push(`%${name}%`)
    }
    if (status) {
      whereSql += ' AND o.status = ?'
      whereArgs.push(status)
    }

    const totalRes = await db.get<{ cnt: number }>(`
      SELECT COUNT(1) as cnt 
      FROM orders o
      JOIN users u ON u.id = o.user_id
      WHERE ${whereSql}
    `, whereArgs)
    const total = totalRes?.cnt || 0

    const orderRows = await db.all<{
      id: string
      order_no: string
      created_at: string
      amount_paid_cents: number
      pay_method: string
      status: string
      user_id: string
      nickname: string
      phone: string | null
    }>(
      `SELECT o.id, o.order_no, o.created_at, o.amount_paid_cents, o.pay_method, o.status,
              u.id as user_id, u.nickname, u.phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...whereArgs, pageSize, offset]
    )

    const orderIds = orderRows.map((o) => o.id)
    type OrderItemRow = {
      id: string
      order_id: string
      sku_text: string | null
      quantity: number
      product_id: string
      product_name: string
      product_image_url: string | null
    }

    const itemsRows = orderIds.length
      ? await db.all<OrderItemRow>(
          `SELECT oi.id, oi.order_id, oi.sku_text, oi.quantity,
                  p.id as product_id, p.name as product_name, p.image_url as product_image_url
           FROM order_items oi
           JOIN products p ON p.id = oi.product_id
           WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
          orderIds
        )
      : []

    const itemsByOrderId = new Map<string, OrderItemRow[]>()
    for (const it of itemsRows) {
      const list = itemsByOrderId.get(it.order_id)
      if (list) list.push(it)
      else itemsByOrderId.set(it.order_id, [it])
    }

    res.json(
      ok({
        items: orderRows.map((o) => ({
          id: o.id,
          orderNo: o.order_no,
          createdAt: o.created_at,
          buyer: { id: o.user_id, name: o.nickname, phone: o.phone, phoneMasked: maskPhone(o.phone) },
          pay: { amountPaid: formatCents(o.amount_paid_cents), currency: 'CNY', method: o.pay_method },
          status: o.status,
          items: (itemsByOrderId.get(o.id) || []).map((it) => ({
            id: it.id,
            skuText: it.sku_text,
            quantity: it.quantity,
            product: { id: it.product_id, name: it.product_name, imageUrl: it.product_image_url }
          }))
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.get('/api/v1/admin/shop/orders/export', requireAuth, async (req, res) => {
    const db = await getDb()
    const { q, name, status } = req.query

    let whereSql = '1=1'
    const whereArgs: any[] = []

    if (q) {
      whereSql += ' AND (o.order_no LIKE ? OR u.phone LIKE ?)'
      whereArgs.push(`%${q}%`, `%${q}%`)
    }
    if (name) {
      whereSql += ' AND u.nickname LIKE ?'
      whereArgs.push(`%${name}%`)
    }
    if (status) {
      whereSql += ' AND o.status = ?'
      whereArgs.push(status)
    }

    const orderRows = await db.all<{
      id: string
      order_no: string
      created_at: string
      amount_paid_cents: number
      pay_method: string
      status: string
      nickname: string
      phone: string | null
    }>(
      `SELECT o.id, o.order_no, o.created_at, o.amount_paid_cents, o.pay_method, o.status,
              u.nickname, u.phone
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE ${whereSql}
       ORDER BY o.created_at DESC`,
      whereArgs
    )

    let csv = '\uFEFF订单号,创建时间,买家姓名,买家手机号,实付金额,支付方式,状态\n'
    for (const o of orderRows) {
      const amount = formatCents(o.amount_paid_cents).toFixed(2)
      let methodText = o.pay_method
      if (methodText === 'wechat') methodText = '微信支付'
      if (methodText === 'alipay') methodText = '支付宝'
      let statusText = o.status
      if (statusText === 'unpaid') statusText = '待付款'
      if (statusText === 'to_ship') statusText = '待发货'
      if (statusText === 'shipped') statusText = '已发货'
      if (statusText === 'completed') statusText = '已完成'
      if (statusText === 'cancelled') statusText = '已取消'
      csv += `${o.order_no},${o.created_at},${o.nickname},${o.phone || ''},${amount},${methodText},${statusText}\n`
    }

    res.header('Content-Type', 'text/csv; charset=utf-8')
    res.header('Content-Disposition', 'attachment; filename=orders.csv')
    res.send(csv)
  })

  app.get('/api/v1/admin/services/appointments', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const { serviceType } = req.query

    let whereSql = '1=1'
    const whereArgs: any[] = []

    if (serviceType) {
      whereSql += ' AND a.service_name = ?'
      whereArgs.push(serviceType)
    }

    const totalRes = await db.get<{ cnt: number }>(`
      SELECT COUNT(1) as cnt 
      FROM appointments a
      WHERE ${whereSql}
    `, whereArgs)
    const total = totalRes?.cnt || 0

    const rows = await db.all<{
      id: string
      booking_no: string
      created_at: string
      status: string
      user_id: string
      nickname: string
      phone: string | null
      pet_name_cn: string | null
      pet_breed: string | null
      pet_avatar_url: string | null
      service_name: string
      schedule_type: string
      start_at: string | null
      end_at: string | null
      duration_minutes: number | null
    }>(
      `SELECT a.id, a.booking_no, a.created_at, a.status, a.pet_name_cn, a.pet_breed, a.pet_avatar_url,
              a.service_name, a.schedule_type, a.start_at, a.end_at, a.duration_minutes,
              u.id as user_id, u.nickname, u.phone
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       WHERE ${whereSql}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...whereArgs, pageSize, offset]
    )

    res.json(
      ok({
        items: rows.map((r) => ({
          id: r.id,
          bookingNo: r.booking_no,
          createdAt: r.created_at,
          status: r.status,
          owner: { id: r.user_id, name: r.nickname, phone: r.phone, phoneMasked: maskPhone(r.phone) },
          pet: { id: r.user_id, nameCn: r.pet_name_cn, avatarUrl: r.pet_avatar_url, breed: r.pet_breed },
          service: { id: r.service_name, name: r.service_name },
          schedule: {
            type: r.schedule_type,
            startAt: r.start_at,
            endAt: r.end_at,
            durationMinutes: r.duration_minutes
          }
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.get('/api/v1/admin/services/appointments/export', requireAuth, async (req, res) => {
    const db = await getDb()
    const { serviceType } = req.query

    let whereSql = '1=1'
    const whereArgs: any[] = []

    if (serviceType) {
      whereSql += ' AND a.service_name = ?'
      whereArgs.push(serviceType)
    }

    const rows = await db.all<{
      id: string
      booking_no: string
      created_at: string
      status: string
      nickname: string
      phone: string | null
      pet_name_cn: string | null
      pet_breed: string | null
      service_name: string
      schedule_type: string
      start_at: string | null
      end_at: string | null
      duration_minutes: number | null
    }>(
      `SELECT a.id, a.booking_no, a.created_at, a.status, a.pet_name_cn, a.pet_breed,
              a.service_name, a.schedule_type, a.start_at, a.end_at, a.duration_minutes,
              u.nickname, u.phone
       FROM appointments a
       JOIN users u ON u.id = a.user_id
       WHERE ${whereSql}
       ORDER BY a.created_at DESC`,
      whereArgs
    )

    let csv = '\uFEFF预约号,创建时间,客户姓名,联系电话,宠物名,宠物品种,服务类型,预约时段,状态\n'
    for (const a of rows) {
      let scheduleText = ''
      if (a.schedule_type === 'timeslot' && a.start_at && a.end_at) {
        scheduleText = `${a.start_at.slice(0, 16)} - ${a.end_at.slice(11, 16)}`
      } else if (a.schedule_type === 'date' && a.start_at) {
        scheduleText = a.start_at.slice(0, 10)
      }
      
      let statusText = a.status
      if (statusText === 'pending_service') statusText = '待服务'
      if (statusText === 'arrived') statusText = '已到店'
      if (statusText === 'completed') statusText = '已完成'
      if (statusText === 'cancelled') statusText = '已取消'
      
      csv += `${a.booking_no},${a.created_at},${a.nickname},${a.phone || ''},${a.pet_name_cn || ''},${a.pet_breed || ''},${a.service_name},${scheduleText},${statusText}\n`
    }

    res.header('Content-Type', 'text/csv; charset=utf-8')
    res.header('Content-Disposition', 'attachment; filename=appointments.csv')
    res.send(csv)
  })

  app.get('/api/v1/admin/system/admins', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM admins'))?.cnt || 0
    const rows = await db.all<{
      id: number
      username: string
      name: string
      phone: string | null
      role: string
      status: string
      last_login_at: string | null
      created_at: string
    }>(
      `SELECT id, username, name, phone, role, status, last_login_at, created_at
       FROM admins
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )
    res.json(
      ok({
        items: rows.map((a) => ({
          id: a.id,
          username: a.username,
          name: a.name,
          phone: a.phone,
          role: { id: a.role, name: a.role === 'super_admin' ? '超级管理员' : '管理员' },
          status: a.status,
          lastLoginAt: a.last_login_at,
          createdAt: a.created_at
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.get('/api/v1/admin/system/logs', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM audit_logs'))?.cnt || 0

    const rows = await db.all<{
      id: number
      serial_no: string
      module: string
      action: string
      ip: string | null
      created_at: string
      admin_id: number | null
      admin_name: string | null
    }>(
      `SELECT l.id, l.serial_no, l.module, l.action, l.ip, l.created_at, l.admin_id,
              a.name as admin_name
       FROM audit_logs l
       LEFT JOIN admins a ON a.id = l.admin_id
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )

    res.json(
      ok({
        items: rows.map((r) => ({
          id: r.id,
          serialNo: r.serial_no,
          module: r.module,
          action: r.action,
          ip: r.ip,
          createdAt: r.created_at,
          operator: { id: r.admin_id, name: r.admin_name || '系统' }
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.post('/api/v1/admin/system/admins', requireAuth, async (req, res) => {
    const db = await getDb()
    const { username, name, phone, role } = req.body || {}
    if (!username || !name) {
      res.status(400).json(fail(400, 'username/name 不能为空'))
      return
    }
    const passwordHash = await bcrypt.hash('admin123', 10)
    try {
      const result = await db.run(
        `INSERT INTO admins (username, name, phone, role, password_hash, status) VALUES (?, ?, ?, ?, ?, ?)`
        , [String(username), String(name), phone ? String(phone) : null, role ? String(role) : 'admin', passwordHash, 'active']
      )
      await writeAuditLog({
        adminId: Number(((req as any).adminJwt as any).sub),
        module: '账户管理',
        action: `创建管理员 ${username}`,
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined
      })
      res.json(ok({ id: result.lastID }))
    } catch {
      res.status(400).json(fail(400, '创建失败（可能用户名重复）'))
    }
  })

  app.use((_req, res) => {
    res.status(404).json(fail(404, 'Not Found'))
  })

  app.listen(env.port, () => {
    console.log(`[admin-api] listening on http://127.0.0.1:${env.port}`)
  })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
