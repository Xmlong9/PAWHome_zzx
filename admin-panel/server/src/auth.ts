import jwt from 'jsonwebtoken'
import { env } from './env'

export type AdminJwtPayload = {
  sub: string
  username: string
  name: string
}

export function signAdminToken(payload: AdminJwtPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' })
}

export function verifyAdminToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as AdminJwtPayload & {
    iat: number
    exp: number
  }
}

