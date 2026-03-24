#!/usr/bin/env node
/**
 * daily-report.js
 * 每日定时日报脚本 - 通过 Windows 任务计划程序在每晚 22:00 执行
 * 功能：汇总当日开发活动，写入飞书AI开发日报表，并发送到毕业设计群
 *
 * 使用方式：node f:/PAWHome/.claude/scripts/daily-report.js
 */

const https = require('https')

// ============================================================
// 配置区
// ============================================================
const CONFIG = {
  // 飞书应用凭证
  APP_ID: 'cli_a91765088838dcc5',
  APP_SECRET: 'laqbC0I1NS2Xa931AenlcgliOV5L2zp8',

  // 飞书多维表格
  BITABLE_APP_TOKEN: 'XCyubP2kOaZTg8szZPtcM9cknse',
  TABLE_DAILY: 'tblWCt8V7dNrErSj',       // AI开发日报
  TABLE_TASKS: 'tblnvYcZzV7aZfAM',       // 开发任务看板
  TABLE_CHANGELOG: 'tbluZVMIqBX8k52Z',   // 产品修改日志

  // 飞书群
  CHAT_ID: 'oc_8a82b00306cd3800171aed827be84ac8',

  // 飞书 API
  BASE_URL: 'https://open.feishu.cn/open-apis'
}

// ============================================================
// 工具函数
// ============================================================

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (e) { reject(e) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function getTenantAccessToken() {
  const result = await httpsRequest({
    hostname: 'open.feishu.cn',
    path: '/open-apis/auth/v3/tenant_access_token/internal',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    app_id: CONFIG.APP_ID,
    app_secret: CONFIG.APP_SECRET
  })
  return result.tenant_access_token
}

async function searchRecords(token, tableId, filter) {
  const body = filter ? { filter } : {}
  const result = await httpsRequest({
    hostname: 'open.feishu.cn',
    path: `/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_TOKEN}/tables/${tableId}/records/search?page_size=100`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, body)
  return result.data?.items || []
}

async function createRecord(token, tableId, fields) {
  return httpsRequest({
    hostname: 'open.feishu.cn',
    path: `/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_TOKEN}/tables/${tableId}/records`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { fields })
}

async function sendGroupMessage(token, content) {
  return httpsRequest({
    hostname: 'open.feishu.cn',
    path: '/open-apis/im/v1/messages?receive_id_type=chat_id',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, {
    receive_id: CONFIG.CHAT_ID,
    msg_type: 'text',
    content: JSON.stringify({ text: content })
  })
}

// ============================================================
// 工具：提取飞书富文本字段的纯文本
// ============================================================

function extractText(field) {
  if (!field) return ''
  if (typeof field === 'string') return field
  if (Array.isArray(field)) return field.map(item => item.text || '').join('')
  return String(field)
}

// ============================================================
// 日报生成逻辑
// ============================================================

async function generateDailyReport() {
  console.log('🚀 开始生成日报...')

  const token = await getTenantAccessToken()
  const now = new Date()
  // 北京时间 UTC+8
  const bjOffset = 8 * 60 * 60 * 1000
  const bjNow = new Date(now.getTime() + bjOffset)
  const pad = n => String(n).padStart(2, '0')
  const dateStr = `${bjNow.getUTCFullYear()}-${pad(bjNow.getUTCMonth()+1)}-${pad(bjNow.getUTCDate())} ${pad(bjNow.getUTCHours())}:${pad(bjNow.getUTCMinutes())}`
  const todayStart = Date.UTC(bjNow.getUTCFullYear(), bjNow.getUTCMonth(), bjNow.getUTCDate()) - bjOffset

  // 获取所有任务
  const allTasks = await searchRecords(token, CONFIG.TABLE_TASKS)
  const completedTasks = allTasks.filter(r => r.fields['状态'] === '完成')
  const inProgressTasks = allTasks.filter(r => r.fields['状态'] === '开发中')
  const todoTasks = allTasks.filter(r => r.fields['状态'] === '代做')

  // 获取今日产品修改日志
  const changelogs = await searchRecords(token, CONFIG.TABLE_CHANGELOG)
  const todayChangelogs = changelogs.filter(r => {
    const ts = r.fields['提交日期']
    return ts && ts >= todayStart
  })

  // 统计数据
  const completedCount = completedTasks.length
  const inProgressCount = inProgressTasks.length
  const changeCount = todayChangelogs.length
  const total = allTasks.length
  const progressPct = total > 0 ? Math.round(completedCount / total * 100) : 0

  // 生成消息用列表（使用 extractText 解析富文本）
  const completedList = completedTasks.slice(0, 5)
    .map(r => `• ${extractText(r.fields['任务名称']) || '未命名任务'}`)
    .join('\n') || '• 暂无完成任务'

  const inProgressList = inProgressTasks.slice(0, 5)
    .map(r => `• ${extractText(r.fields['任务名称']) || '未命名任务'}`)
    .join('\n') || '• 暂无进行中任务'

  const changelogList = todayChangelogs.slice(0, 3)
    .map(r => `• ${extractText(r.fields['版本号']) || ''} ${extractText(r.fields['AI总结']) || extractText(r.fields['修改内容']) || ''}`.trim())
    .join('\n') || '• 暂无变更记录'

  // 生成丰富的AI总结（写入多维表格）
  const inProgressNames = inProgressTasks.slice(0, 6)
    .map(r => extractText(r.fields['任务名称']).split(' ')[0])
    .join('、')
  const todoNames = todoTasks.slice(0, 4)
    .map(r => extractText(r.fields['任务名称']).split(' ')[0])
    .join('、')
  const todayVersions = todayChangelogs.map(r => extractText(r.fields['版本号'])).filter(Boolean).join('、')

  const summary = [
    `【${dateStr} 日报】`,
    `整体进度 ${progressPct}%（${completedCount}/${total} 完成）`,
    inProgressCount > 0 ? `开发中（${inProgressCount}项）：${inProgressNames}${inProgressCount > 6 ? '等' : ''}` : '暂无进行中任务',
    todoTasks.length > 0 ? `待开发（${todoTasks.length}项）：${todoNames}${todoTasks.length > 4 ? '等' : ''}` : '',
    todayVersions ? `今日版本：${todayVersions}，提交${changeCount}次` : `今日代码提交 ${changeCount} 次`
  ].filter(Boolean).join('。') + '。'

  // 写入飞书AI开发日报表（含关联看板字段）
  const dailyFields = {
    '日期': now.getTime(),
    '代码提交数': changeCount,
    'AI自动总结日报（AI字段）': summary
  }
  // 关联今日完成任务（文本格式）
  if (completedTasks.length > 0) {
    dailyFields['今日完成任务（关联看板）'] = completedTasks
      .map(r => `• ${extractText(r.fields['任务名称']) || '未命名任务'}`)
      .join('\n')
  }
  await createRecord(token, CONFIG.TABLE_DAILY, dailyFields)

  // 发送群消息
  const message = `📊 PawHome 开发日报 · ${dateStr}

✅ 已完成（${completedCount}项）：
${completedList}

🔧 进行中（${inProgressCount}项）：
${inProgressList}

📝 今日变更（${changeCount}次）：
${changelogList}

📈 整体进度：✅${completedCount} / 🔧${inProgressCount} / 📋${todoTasks.length}，共 ${total} 个任务

—— AI项目经理 自动生成`

  await sendGroupMessage(token, message)
  console.log('✅ 日报已生成并发送到毕业设计群')
}

// ============================================================
// 周报生成逻辑（每周日执行）
// ============================================================

async function generateWeeklyReport(force = false) {
  const now = new Date()
  const bjOffset = 8 * 60 * 60 * 1000
  const bjNow = new Date(now.getTime() + bjOffset)
  if (!force && bjNow.getUTCDay() !== 0) return // 只在周日执行（北京时间）

  console.log('🚀 开始生成周报...')
  const token = await getTenantAccessToken()

  const pad = n => String(n).padStart(2, '0')
  const weekEnd = bjNow
  const weekStart = new Date(bjNow.getTime() - 6 * 24 * 60 * 60 * 1000)
  const fmt = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`
  const weekStartStr = fmt(weekStart)
  const weekEndStr = fmt(weekEnd)

  const allTasks = await searchRecords(token, CONFIG.TABLE_TASKS)
  const completedTasks = allTasks.filter(r => r.fields['状态'] === '完成')
  const inProgressTasks = allTasks.filter(r => r.fields['状态'] === '开发中')
  const todoTasks = allTasks.filter(r => r.fields['状态'] === '代做')

  const completedList = completedTasks.slice(0, 8)
    .map(r => `• ${extractText(r.fields['任务名称']) || '未命名任务'}`)
    .join('\n') || '• 暂无完成任务'

  const message = `📋 PawHome 开发周报 · ${weekStartStr} ~ ${weekEndStr}

✅ 本周累计完成任务：${completedTasks.length} 项
${completedList}

🔧 进行中任务：${inProgressTasks.length} 项
📋 待开发任务：${todoTasks.length} 项
📊 总任务数：${allTasks.length} 项

详细数据请查看飞书多维表格 👉 AI开发日报

—— AI项目经理 自动生成`

  await sendGroupMessage(token, message)
  console.log('✅ 周报已发送')
}

// ============================================================
// 主入口
// ============================================================

;(async () => {
  try {
    await generateDailyReport()
    await generateWeeklyReport(process.argv.includes('--weekly'))
  } catch (err) {
    console.error('❌ 日报生成失败:', err.message)
    process.exit(1)
  }
})()
