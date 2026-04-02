import dotenv from 'dotenv'

dotenv.config({ path: new URL('../.env', import.meta.url) })

export const env = {
  port: Number(process.env.PORT || 5101),
  jwtSecret: String(process.env.JWT_SECRET || 'dev-secret-change-me'),
  dbPath: String(process.env.DB_PATH || './server/data/dev.sqlite')
}
