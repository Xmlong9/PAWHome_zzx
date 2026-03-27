import dotenv from 'dotenv'
import fs from 'node:fs/promises'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!supabaseUrl) throw new Error('Missing env: SUPABASE_URL')
if (!accessToken) throw new Error('Missing env: SUPABASE_ACCESS_TOKEN')

const args = process.argv.slice(2)
const getFlagValue = (flag) => {
  const idx = args.indexOf(flag)
  if (idx === -1) return null
  const value = args[idx + 1]
  if (!value || value.startsWith('--')) return null
  return value
}

const queryText = getFlagValue('--query')
const filePath = getFlagValue('--file')

if (!queryText && !filePath) {
  throw new Error('Usage: node scripts/supabase-db-query.mjs --query "select 1" | --file supabase/migrations/<name>.sql')
}

if (queryText && filePath) {
  throw new Error('Use only one of --query or --file')
}

const ref = new URL(supabaseUrl).hostname.split('.')[0]
const managementQueryUrl = `https://api.supabase.com/v1/projects/${ref}/database/query`

const query = filePath ? await fs.readFile(filePath, 'utf8') : queryText

const res = await fetch(managementQueryUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query })
})

const text = await res.text()

if (!res.ok) {
  throw new Error(`Supabase Management API database/query failed: ${res.status} ${text}`)
}

try {
  console.log(JSON.stringify(JSON.parse(text), null, 2))
} catch {
  console.log(text)
}

