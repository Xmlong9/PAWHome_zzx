#!/usr/bin/env node
/**
 * cleanup-tables.js
 * 清理飞书多维表格中的空白默认行
 * 使用方式：node f:/PAWHome/.claude/scripts/cleanup-tables.js
 */

const https = require('https')

const CONFIG = {
  APP_ID: 'cli_a91765088838dcc5',
  APP_SECRET: 'laqbC0I1NS2Xa931AenlcgliOV5L2zp8',
  BITABLE_APP_TOKEN: 'XCyubP2kOaZTg8szZPtcM9cknse',
}

// 需要清理的空记录 ID（按表分组）
const EMPTY_RECORDS = {
  // 数据表
  tbl7alAVjri8uWPX: [
    'recwbJ5yZK', 'recgI941HE', 'receFFVmsp', 'recE9YP2Bj', 'recFMfSHKG',
    'recvcaoDDZvjMI', 'recvcaoRpRZ4PL' // 测试记录
  ],
  // 开发任务看板
  tblnvYcZzV7aZfAM: [
    'recvc9huRy7Sjy', 'recvc9huRyIZhU', 'recvc9huRyOfKO', 'recvc9huRyrb2I', 'recvc9huRyZaG3'
  ],
  // AI项目总控台
  tbloG5JafgkNWwQj: [
    'recvc9f1HMPmVv', 'recvc9f1HMdOra', 'recvc9f1HMQafn', 'recvc9f1HMlmxb'
  ],
  // 需求文档库（只有需求ID没有内容的行）
  tblM5epSe8616rUz: [
    'recvc9g1uTxCUI', 'recvc9g1uTG844', 'recvc9g1uTZmE8', 'recvc9g1uT8LVe', 'recvc9g1uTvhQx'
  ],
  // API接口文档
  tblsWknwfxAi4MKI: [
    'recvc9j6OyzCmP', 'recvc9j6OylDV4', 'recvc9j6Oy7Axp', 'recvc9j6OyXCAD', 'recvc9j6OyNe0b'
  ],
  // 产品修改日志
  tbluZVMIqBX8k52Z: [
    'recvc9jIhkbjWU', 'recvc9jIhkKAMd', 'recvc9jIhkgFRT', 'recvc9jIhkRQI1', 'recvc9jIhkw39i'
  ],
  // AI开发日报（默认行 + 无效测试行）
  tblWCt8V7dNrErSj: [
    'recvc9lcO7BCkb', 'recvc9lcO7u25r', 'recvc9lcO7VXIt', 'recvc9lcO72qlf', 'recvc9lcO7mjSv',
    'recvcaAjoMsVF8', 'recvcaDBHjmUaH'
  ]
}

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
  }, { app_id: CONFIG.APP_ID, app_secret: CONFIG.APP_SECRET })
  return result.tenant_access_token
}

async function batchDeleteRecords(token, tableId, recordIds) {
  return httpsRequest({
    hostname: 'open.feishu.cn',
    path: `/open-apis/bitable/v1/apps/${CONFIG.BITABLE_APP_TOKEN}/tables/${tableId}/records/batch_delete`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { records: recordIds })
}

;(async () => {
  console.log('🧹 开始清理空白行...')
  const token = await getTenantAccessToken()

  for (const [tableId, recordIds] of Object.entries(EMPTY_RECORDS)) {
    if (recordIds.length === 0) continue
    for (let i = 0; i < recordIds.length; i += 500) {
      const batch = recordIds.slice(i, i + 500)
      const result = await batchDeleteRecords(token, tableId, batch)
      if (result.code === 0) {
        console.log(`✅ 表 ${tableId}：删除 ${batch.length} 条空记录`)
      } else {
        console.error(`❌ 表 ${tableId} 删除失败:`, result.msg)
      }
    }
  }
  console.log('✅ 清理完成')
})()
