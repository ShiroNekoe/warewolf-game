import { Redis } from '@upstash/redis'

let redis = null

export function getRedis() {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

const TTL = parseInt(process.env.GAME_SESSION_TTL || '7200') // 2 jam default

export const keys = {
  room: (code) => `room:${code}`,
  players: (code) => `players:${code}`,
  gameState: (code) => `game_state:${code}`,
  votes: (code) => `votes:${code}`,
  session: (code, playerId) => `session:${code}:${playerId}`,
  roleViewed: (code, playerId) => `role_viewed:${code}:${playerId}`,
}

async function safeGet(r, key) {
  try {
    const data = await r.get(key)
    if (!data) return null
    if (typeof data === 'string') {
      try { return JSON.parse(data) } catch { return data }
    }
    return data
  } catch { return null }
}

async function safeTTL(r, key) {
  try {
    const ttl = await r.ttl(key)
    return ttl > 0 ? ttl : TTL
  } catch { return TTL }
}

// ─── ROOM ─────────────────────────────────────────────
export async function createRoom(code, roomData) {
  const r = getRedis()
  await Promise.all([
    r.setex(keys.room(code), TTL, JSON.stringify(roomData)),
    r.setex(keys.players(code), TTL, JSON.stringify([])),
    r.setex(keys.gameState(code), TTL, JSON.stringify({
      phase: 'lobby', round: 0, nightKill: null,
      guardedPlayer: null, witcherUsed: false,
      eliminatedPlayers: [], winner: null,
    })),
  ])
}

export async function getRoom(code) {
  return safeGet(getRedis(), keys.room(code))
}

export async function updateRoom(code, roomData) {
  const r = getRedis()
  const ttl = await safeTTL(r, keys.room(code))
  await r.setex(keys.room(code), ttl, JSON.stringify(roomData))
}

// ─── PLAYERS ──────────────────────────────────────────
export async function getPlayers(code) {
  const data = await safeGet(getRedis(), keys.players(code))
  return Array.isArray(data) ? data : []
}

export async function addPlayer(code, player) {
  const r = getRedis()
  const players = await getPlayers(code)
  if (!players.find(p => p.id === player.id)) {
    players.push(player)
    const ttl = await safeTTL(r, keys.players(code))
    await r.setex(keys.players(code), ttl, JSON.stringify(players))
  }
  return players
}

export async function updatePlayers(code, players) {
  const r = getRedis()
  const ttl = await safeTTL(r, keys.players(code))
  await r.setex(keys.players(code), ttl, JSON.stringify(players))
}

// ─── GAME STATE ───────────────────────────────────────
export async function getGameState(code) {
  return safeGet(getRedis(), keys.gameState(code))
}

export async function updateGameState(code, state) {
  const r = getRedis()
  const ttl = await safeTTL(r, keys.gameState(code))
  await r.setex(keys.gameState(code), ttl, JSON.stringify(state))
}

// ─── VOTES ────────────────────────────────────────────
export async function saveVotes(code, votes) {
  const r = getRedis()
  await r.setex(keys.votes(code), 900, JSON.stringify(votes))
}

export async function getVotes(code) {
  const data = await safeGet(getRedis(), keys.votes(code))
  return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
}

export async function clearVotes(code) {
  await getRedis().del(keys.votes(code))
}

// ─── SESSION TOKEN (anti-refresh/cheat) ───────────────
export async function createSessionToken(code, playerId, token) {
  const r = getRedis()
  await r.setex(keys.session(code, playerId), TTL, token)
}

export async function validateSessionToken(code, playerId, token) {
  const r = getRedis()
  const stored = await r.get(keys.session(code, playerId))
  return stored === token
}

// ─── ROLE VIEWED (anti-cheat: role hanya bisa dilihat 1x dari server) ──
export async function markRoleViewed(code, playerId) {
  const r = getRedis()
  await r.setex(keys.roleViewed(code, playerId), TTL, '1')
}

export async function hasViewedRole(code, playerId) {
  const r = getRedis()
  const val = await r.get(keys.roleViewed(code, playerId))
  return val === '1'
}

// ─── CLEANUP ──────────────────────────────────────────
export async function cleanupRoom(code) {
  const r = getRedis()
  const players = await getPlayers(code)
  const delPromises = [
    r.del(keys.room(code)),
    r.del(keys.players(code)),
    r.del(keys.gameState(code)),
    r.del(keys.votes(code)),
    ...players.map(p => r.del(keys.session(code, p.id))),
    ...players.map(p => r.del(keys.roleViewed(code, p.id))),
  ]
  await Promise.all(delPromises)
}
