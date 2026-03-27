import { getSupabaseEnv, requestSupabaseJson } from './supabase-admin.mjs'

const { supabaseUrl, anonKey, serviceRoleKey } = getSupabaseEnv()

const health = await requestSupabaseJson(`${supabaseUrl}/auth/v1/health`, {
  headers: { apikey: anonKey }
})

const buckets = await requestSupabaseJson(`${supabaseUrl}/storage/v1/bucket`, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${serviceRoleKey}`
  }
})

if (!health.ok) {
  throw new Error(`Supabase auth health check failed: ${health.status} ${JSON.stringify(health.json)}`)
}

if (!buckets.ok) {
  throw new Error(`Supabase storage bucket list failed: ${buckets.status} ${JSON.stringify(buckets.json)}`)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      authHealth: { status: health.status, body: health.json },
      storageBuckets: { status: buckets.status, body: buckets.json }
    },
    null,
    2
  )
)
