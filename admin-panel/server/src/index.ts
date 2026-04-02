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
    }>(
      `SELECT id, nickname, phone, gender, avatar_url, status, registered_at
       FROM users
       ORDER BY registered_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )

    res.json(
      ok({
        items: rows.map((u) => ({
          id: u.id,
          nickname: u.nickname,
          phone: u.phone,
          phoneMasked: maskPhone(u.phone),
          gender: u.gender,
          avatarUrl: u.avatar_url,
          status: u.status,
          registeredAt: u.registered_at
        })),
        page,
        pageSize,
        total
      })
    )
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
          imageUrl: r.image_url,
          createdAt: r.created_at
        })),
        page,
        pageSize,
        total
      })
    )
  })

  app.get('/api/v1/admin/shop/orders', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)

    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM orders'))?.cnt || 0
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
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
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

  app.get('/api/v1/admin/services/appointments', requireAuth, async (req, res) => {
    const db = await getDb()
    const { page, pageSize, offset } = parsePage(req)
    const total = (await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM appointments'))?.cnt || 0

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
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
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
