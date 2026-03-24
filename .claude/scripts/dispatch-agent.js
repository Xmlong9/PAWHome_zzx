#!/usr/bin/env node
/**
 * dispatch-agent.js - PostToolUse hook
 * miniprogram 文件变更时自动同步：产品修改日志 + 开发任务看板 + 数据表（页面清单）
 */
const https = require('https')

const APP_ID = 'cli_a91765088838dcc5'
const APP_SECRET = 'laqbC0I1NS2Xa931AenlcgliOV5L2zp8'
const APP_TOKEN = 'XCyubP2kOaZTg8szZPtcM9cknse'
const T_CHANGELOG = 'tbluZVMIqBX8k52Z'
const T_TASKS     = 'tblnvYcZzV7aZfAM'
const T_PAGES     = 'tbl7alAVjri8uWPX'

function isMiniFile(fp) {
  return /miniprogram\/(pages|components|custom-tab-bar)\/.+\.(ts|wxml|wxss|js)$/.test(fp)
}
function pageName(fp) {
  const m = fp.match(/miniprogram\/(?:pages|components|custom-tab-bar)\/([^/]+)/)
  return m ? m[1] : fp.split('/').slice(-2,-1)[0] || 'unknown'
}
function txt(f) {
  if (!f) return ''
  if (typeof f === 'string') return f
  if (Array.isArray(f)) return f.map(i => i.text||'').join('')
  return String(f)
}

function req(method, token, path, body) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname: 'open.feishu.cn', path, method,
      headers: { 'Content-Type': 'application/json', ...(token ? {'Authorization':`Bearer ${token}`} : {}) }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch(e) { reject(e) } })
    })
    r.on('error', reject)
    if (body) r.write(JSON.stringify(body))
    r.end()
  })
}

async function getToken() {
  const r = await req('POST', null, '/open-apis/auth/v3/tenant_access_token/internal', { app_id: APP_ID, app_secret: APP_SECRET })
  return r.tenant_access_token
}

const base = `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables`

;(async () => {
  try {
    let raw = ''
    process.stdin.on('data', c => raw += c)
    await new Promise(resolve => process.stdin.on('end', resolve))

    let hookData
    try { hookData = JSON.parse(raw) } catch { process.exit(0) }

    const toolName = hookData.tool_name || ''
    const filePath = (hookData.tool_input?.file_path || '').replace(/\\/g, '/')
    if (!isMiniFile(filePath)) process.exit(0)

    const now = new Date()
    const bjNow = new Date(now.getTime() + 8 * 3600000)
    const pad = n => String(n).padStart(2, '0')
    const dateVer = `${bjNow.getUTCFullYear()}${pad(bjNow.getUTCMonth()+1)}${pad(bjNow.getUTCDate())}`
    const page = pageName(filePath)
    const file = filePath.split('/').pop()
    const action = toolName === 'Write' ? '新建' : '修改'
    const token = await getToken()

    // 1. 产品修改日志
    await req('POST', token, `${base}/${T_CHANGELOG}/records`, { fields: {
      '版本号': `v0.1-${dateVer}`,
      '修改内容': `${action} ${page}/${file}`,
      '提交日期': now.getTime(),
      'AI总结': `${action}了 ${page} 页面的 ${file} 文件`
    }})

    // 2. 开发任务看板：匹配任务名称前缀，状态改为"开发中"（已完成的跳过）
    const tasksRes = await req('POST', token, `${base}/${T_TASKS}/records/search?page_size=50`, {})
    const matchTask = (tasksRes.data?.items || []).find(r =>
      txt(r.fields['任务名称']).toLowerCase().startsWith(page.toLowerCase()) &&
      r.fields['状态'] !== '完成'
    )
    if (matchTask) {
      await req('PUT', token, `${base}/${T_TASKS}/records/${matchTask.record_id}`, { fields: { '状态': '开发中' } })
    }

    // 3. 数据表（页面清单）：匹配页面路径，更新状态和时间
    const pagesRes = await req('POST', token, `${base}/${T_PAGES}/records/search?page_size=50`, {})
    const matchPage = (pagesRes.data?.items || []).find(r =>
      txt(r.fields['页面路径']).includes(page)
    )
    if (matchPage) {
      await req('PUT', token, `${base}/${T_PAGES}/records/${matchPage.record_id}`, { fields: {
        '状态': '开发中',
        '更新时间': now.getTime()
      }})
    }

    console.log(`✅ 已同步: ${page}/${file} → 日志+看板+数据表`)
  } catch {
    process.exit(0)
  }
})()
