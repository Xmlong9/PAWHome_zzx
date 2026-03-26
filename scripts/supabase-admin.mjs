import dotenv from 'dotenv'

dotenv.config()

export const getSupabaseEnv = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('Missing env: SUPABASE_URL')
  if (!anonKey) throw new Error('Missing env: SUPABASE_ANON_KEY')
  if (!serviceRoleKey) throw new Error('Missing env: SUPABASE_SERVICE_ROLE_KEY')

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    anonKey,
    serviceRoleKey
  }
}

export const requestSupabaseJson = async (url, { method = 'GET', headers = {}, body } = {}) => {
  const res = await fetch(url, {
    method,
    headers,
    body
  })

  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }

  return { ok: res.ok, status: res.status, json }
}

