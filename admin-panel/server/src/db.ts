import path from 'path'
import fs from 'fs/promises'
import sqlite3 from 'sqlite3'
import { open, type Database } from 'sqlite'
import { env } from './env'

let dbPromise: Promise<Database<sqlite3.Database, sqlite3.Statement>> | null = null

export async function getDb() {
  if (!dbPromise) {
    const resolved = path.isAbsolute(env.dbPath)
      ? env.dbPath
      : path.resolve(process.cwd(), env.dbPath)

    await fs.mkdir(path.dirname(resolved), { recursive: true })

    dbPromise = open({
      filename: resolved,
      driver: sqlite3.Database
    })
  }

  return dbPromise
}
