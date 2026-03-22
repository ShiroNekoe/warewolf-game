import { getRoom, getPlayers, updateRoom, updatePlayers, updateGameState, markRoleViewed } from '../../../lib/redis'
import { autoScaleRoles, assignRoles, buildRoleArray, validateRoles, ROLES } from '../../../lib/roles'
import { broadcast, EVENTS } from '../../../lib/pusher'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, hostId, roleMode, customRoles } = req.body

  const room = await getRoom(code)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  if (room.hostId !== hostId) return res.status(403).json({ error: 'Hanya host yang bisa start' })
  if (room.status !== 'lobby') return res.status(400).json({ error: 'Game sudah dimulai' })

  const players = await getPlayers(code)
  const nonHostPlayers = players.filter(p => !p.isHost)

  // Minimal 4 pemain NON-HOST agar game bermakna
  if (nonHostPlayers.length < 4) {
    return res.status(400).json({
      error: `Minimal 4 pemain (belum termasuk host). Sekarang: ${nonHostPlayers.length}`,
    })
  }

  // Build role list — hanya untuk non-host players
  let roleList
  if (roleMode === 'custom' && customRoles) {
    const errors = validateRoles(customRoles, nonHostPlayers.length)
    if (errors.length > 0) return res.status(400).json({ error: errors.join(', ') })
    roleList = buildRoleArray(customRoles)
  } else {
    roleList = autoScaleRoles(nonHostPlayers.length)
  }

  // Assign roles: host tetap 'host', player lain dapat role random
  const playersWithRoles = assignRoles(players, roleList)

  // Tandai host sebagai sudah "lihat role" supaya tidak masuk alur role reveal
  const hostPlayer = playersWithRoles.find(p => p.isHost)
  if (hostPlayer) await markRoleViewed(code, hostPlayer.id)

  await Promise.all([
    updatePlayers(code, playersWithRoles),
    updateRoom(code, { ...room, status: 'playing', roleMode }),
    updateGameState(code, {
      phase: 'night',
      round: 1,
      nightKill: null,
      guardedPlayer: null,
      witcherUsed: false,
      eliminatedPlayers: [],
      winner: null,
      startedAt: Date.now(),
    }),
  ])

  // Broadcast — TIDAK sertakan role (pemain fetch sendiri pakai get-role API)
  await broadcast(code, EVENTS.GAME_STARTED, {
    phase: 'night',
    round: 1,
    playerCount: nonHostPlayers.length,
  })

  return res.status(200).json({
    success: true,
    message: `Game dimulai! ${nonHostPlayers.length} pemain mendapat role. Cek role di layar masing-masing.`,
  })
}
