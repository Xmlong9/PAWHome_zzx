import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { getDb } from './db'
import { migrate } from './migrate'
import { pathToFileURL } from 'url'

function isoDaysAgo(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  return d.toISOString()
}

export async function seed() {
  await migrate()
  const db = await getDb()

  const adminCount = await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM admins')
  if ((adminCount?.cnt || 0) === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10)
    await db.run(
      `INSERT INTO admins (username, name, phone, role, password_hash, status) VALUES (?, ?, ?, ?, ?, ?)`
      , ['admin', '超级管理员', '13800000000', 'super_admin', passwordHash, 'active']
    )
  }

  const userCount = await db.get<{ cnt: number }>('SELECT COUNT(1) as cnt FROM users')
  if ((userCount?.cnt || 0) === 0) {
    const users = [
      {
        id: randomUUID(),
        nickname: '橘猫饲养员',
        phone: '13888888899',
        gender: 'female',
        avatar_url:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuA2LiIs_j9MisRdm41_A1Kh9uTm9kFYiVhCtAvCmG46mvhU-kbmKeZqLYTTZagt4HVY8PnJyuoBigl0AscPdRjGCF587MVoNk-23dLBzv3mq_q7NW2H4IzplusMdiBWW_p8Gv_tWTdomP2psovKNTH12ns5tywW3kim8Mye5328Md7nfdCILoFte8W1DjFk6mbrYJxClbSaIFBqaoF0Ws5UUJOK8GPvDyJHdmBzsvE6BaxQuJWTStoigznwtYnP-96yFkQABqD0qpA',
        status: 'active',
        registered_at: isoDaysAgo(2)
      },
      {
        id: randomUUID(),
        nickname: '爱狗人士阿强',
        phone: '15912341234',
        gender: 'male',
        avatar_url:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBxcaNLIRikvH98sRWboDJom7cFCdD5k0JM9TNkZpYntIQwH_mg4AXMm0wga7043oWG-T3JHbq1TDfcHfq6n_HtgHeBt3TU9KHq5vTVonf47aIS2iaQ2IdTZLslqJc2IIPD8vt9TZPAHKXChGmH86QD1ALmvqwljX4gDKqfh9TGP97L7sXoFRwAehEuqSSE63PId_juH1I1Rd90JeFhpok6LBGjc-bZaAqspVb7QAqBYoPsYXjZV1pPP6svS4o46iscSXhGEFghdlk',
        status: 'banned',
        registered_at: isoDaysAgo(4)
      },
      {
        id: randomUUID(),
        nickname: '小王学长',
        phone: '17755665566',
        gender: 'female',
        avatar_url:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCi0j3gJDWSyiJK72jS_9USYMoTSboLsgCVyTouisMs8qVD9KNOOlcmUThaqDmnA-uGz1CmPnw3k4U6jLuyZrll4bzREl9k8OjEC1RUIxjGIcDXR8NnkwP0p04w7DGXq3jJ_ZfRAYiFDg9PzeIGJOZtCB-qP1O44UoEugmDHaeRCM1O3wj5U80Nb9yRfBMRobEjeqmFBXGHVP5bipFhAcbSLgcef7fjY0xIjaQDBOrc49Rgi_TbeqPjtSfx9jhE5kIaFwChsNAIFBQ',
        status: 'active',
        registered_at: isoDaysAgo(1)
      },
      {
        id: randomUUID(),
        nickname: '汪汪队长',
        phone: '13344334432',
        gender: 'male',
        avatar_url:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDhHfkqDhwWn0ba6adL3xugDPauHFTncPvHWBwKupvhNMv4EYuG4xJ_twbS3OYrbZpvRCTMae5VBDNghxXcX2xoOmGJc2QoSw__DSp8ysjA-9JsAGzgTc5PspobhtgwbX2CPoGajJFhaZzEem1KPL0glQ5iT7Na08k2BRSgwXYgtvIZzifAZ637LRyEn46mpctWbIiiFw4f-VS7PhrjOJaE73mqJVCPly7UesGT6R2LAkfUuWkSisHHlIhUHUiAFJsKGRMQ2-4vVO8',
        status: 'active',
        registered_at: isoDaysAgo(0)
      }
    ]

    for (const u of users) {
      await db.run(
        `INSERT INTO users (id, nickname, phone, gender, avatar_url, status, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
        , [u.id, u.nickname, u.phone, u.gender, u.avatar_url, u.status, u.registered_at]
      )
    }

    const products = [
      {
        id: randomUUID(),
        product_no: 'P10024',
        name: '天然无谷高蛋白犬粮 2kg',
        category_text: '宠物主食 / 犬类',
        price_cents: 18900,
        stock_qty: 1240,
        status: 'on_sale',
        image_url:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCmBrKxAKOL7ILF9cUBNridHLDAPjap5m2ZmNw3mk1D0uHbdRylumCPxyomZ35_o8Z0oAKrGUkeVVU7iz4o0knf4WlVXWXQ1kPzT8R8bUgidJtS4sWyKiC4sNCPNZq9Rnu80bMiY0v6N9uSBb4mj3s9i60hOEwT_v1GpdnCybB8Q5PyoAZPMpSeSmPpseSfFLzUu0nz-fDF6HJP3eWuQNomBYXzYxVnrCPR5zhybYALvpya0RlGWY_MEINKA_Qn-G4-b0r0YKrj-RI',
        created_at: isoDaysAgo(20)
      },
      {
        id: randomUUID(),
        product_no: 'P10025',
        name: '简约实木猫抓板 现代版',
        category_text: '宠物用品 / 猫类',
        price_cents: 5800,
        stock_qty: 85,
        status: 'low_stock',
        image_url:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuAf1TfbmDIfRuBu7lXdD3g_X8Tf3UAvX4ESo6fDeht0ZAY0tdT3XNuMIMqrf3A63RLmglH_WLl6hPlf9KDBgO5uXt9WMp88O7AOJswDU0FoyqhDYi5LJgTaigkSkAUNWEX_vzbxskfVb5I36LiZJOSc9nxK1YFSpoisJU33ImkmouUJ2pV5r_XALegjtXJ9AdPBhD3lSv_ycuxJHM6lprCRASYTMFl2MxSKImRlkFBGARtxMRNLn71TPZ--sZJ5wrE1jk6mT5XuZMU',
        created_at: isoDaysAgo(10)
      },
      {
        id: randomUUID(),
        product_no: 'P10026',
        name: '智能自动循环宠物饮水机',
        category_text: '智能设备 / 通用',
        price_cents: 32900,
        stock_qty: 0,
        status: 'off_shelf',
        image_url:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD86wZf-QgXLT2SuWYX4kxEE4bXzXx_Dd1CD8MY9l79TDutnV0T8tBzL82IK8wVKYc2iSQNzCJt_HIqc4qz-3ayUjZk-qJWGaqFAmbfwCrzp_qYS-MxX2YJdUlkpK5sXEUWyl2F1iBvOOFJGiaAgW9kaoA-topxf7XJ7nP2s-SnpfR8g__qWR-3kyKmnTy4NbSVbkx_DS3CQ14weRE5mZtuDZK1SEhfTG_bqzUYs3QZJK4624HG9_4PTESdfccS-sRG3BhTMiLMLRM',
        created_at: isoDaysAgo(3)
      }
    ]

    for (const p of products) {
      await db.run(
        `INSERT INTO products (id, product_no, name, category_text, price_cents, stock_qty, status, image_url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        , [p.id, p.product_no, p.name, p.category_text, p.price_cents, p.stock_qty, p.status, p.image_url, p.created_at]
      )
    }

    const ordersSeed = [
      {
        id: randomUUID(),
        order_no: 'ORD-20231024-001',
        user_id: users[0].id,
        amount_paid_cents: 39800,
        pay_method: 'wechat',
        status: 'to_ship',
        created_at: isoDaysAgo(0)
      },
      {
        id: randomUUID(),
        order_no: 'ORD-20231023-032',
        user_id: users[2].id,
        amount_paid_cents: 18900,
        pay_method: 'alipay',
        status: 'shipped',
        created_at: isoDaysAgo(1)
      }
    ]

    for (const o of ordersSeed) {
      await db.run(
        `INSERT INTO orders (id, order_no, user_id, amount_paid_cents, pay_method, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
        , [o.id, o.order_no, o.user_id, o.amount_paid_cents, o.pay_method, o.status, o.created_at]
      )
    }

    await db.run(
      `INSERT INTO order_items (id, order_id, product_id, sku_text, quantity)
       VALUES (?, ?, ?, ?, ?)`
      , [randomUUID(), ordersSeed[0].id, products[0].id, '经典橘猫款 / 珍珠白 / 超值装', 1]
    )
    await db.run(
      `INSERT INTO order_items (id, order_id, product_id, sku_text, quantity)
       VALUES (?, ?, ?, ?, ?)`
      , [randomUUID(), ordersSeed[1].id, products[1].id, '原木色 / 标准款', 2]
    )

    const posts = [
      {
        id: randomUUID(),
        author_user_id: users[0].id,
        content_preview: '今天带橘猫去体检，医生说很健康！分享下饮食经验…',
        text_type: 'image',
        image_count: 3,
        video_count: 0,
        like_count: 1284,
        comment_count: 86,
        published_at: isoDaysAgo(0)
      },
      {
        id: randomUUID(),
        author_user_id: users[3].id,
        content_preview: '求推荐适合幼犬的狗粮，预算 200 内。',
        text_type: 'text',
        image_count: 0,
        video_count: 0,
        like_count: 240,
        comment_count: 19,
        published_at: isoDaysAgo(2)
      }
    ]

    for (const p of posts) {
      await db.run(
        `INSERT INTO posts (id, author_user_id, content_preview, text_type, image_count, video_count, like_count, comment_count, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        , [
          p.id,
          p.author_user_id,
          p.content_preview,
          p.text_type,
          p.image_count,
          p.video_count,
          p.like_count,
          p.comment_count,
          p.published_at
        ]
      )
    }

    const comments = [
      {
        id: randomUUID(),
        post_id: posts[0].id,
        author_user_id: users[2].id,
        content: '太可爱了！也想看看体检单～',
        like_count: 12,
        status: 'approved',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      },
      {
        id: randomUUID(),
        post_id: posts[1].id,
        author_user_id: users[1].id,
        content: '我家用的无谷系列还不错，肠胃友好。',
        like_count: 2,
        status: 'pending',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]

    for (const c of comments) {
      await db.run(
        `INSERT INTO comments (id, post_id, author_user_id, content, like_count, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
        , [c.id, c.post_id, c.author_user_id, c.content, c.like_count, c.status, c.created_at]
      )
    }

    const appointments = [
      {
        id: randomUUID(),
        booking_no: 'BK-2024032101',
        user_id: users[0].id,
        pet_name_cn: '团子',
        pet_breed: '英国短毛猫',
        pet_avatar_url: users[0].avatar_url,
        service_name: '精致洗澡',
        schedule_type: 'timeslot',
        start_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        end_at: new Date(Date.now() + 3.5 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 90,
        status: 'pending_service',
        created_at: isoDaysAgo(0)
      }
    ]

    for (const a of appointments) {
      await db.run(
        `INSERT INTO appointments (id, booking_no, user_id, pet_name_cn, pet_breed, pet_avatar_url, service_name, schedule_type, start_at, end_at, duration_minutes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        , [
          a.id,
          a.booking_no,
          a.user_id,
          a.pet_name_cn,
          a.pet_breed,
          a.pet_avatar_url,
          a.service_name,
          a.schedule_type,
          a.start_at,
          a.end_at,
          a.duration_minutes,
          a.status,
          a.created_at
        ]
      )
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then(() => {
      process.exit(0)
    })
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
}
