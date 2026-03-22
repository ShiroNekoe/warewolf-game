import { getPlayers, validateSessionToken, hasViewedRole, markRoleViewed } from '../../../lib/redis'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, playerId, sessionToken } = req.body

  if (!code || !playerId || !sessionToken) {
    return res.status(400).json({ error: 'Missing fields' })
  }

  const upperCode = code.toUpperCase()

  // Verifikasi session
  const valid = await validateSessionToken(upperCode, playerId, sessionToken)
  if (!valid) {
    return res.status(403).json({ error: 'Session tidak valid' })
  }

  const players = await getPlayers(upperCode)
  const player = players.find(p => p.id === playerId)

  if (!player) return res.status(404).json({ error: 'Player tidak ditemukan' })
  if (player.isHost) return res.status(200).json({ role: 'host', isHost: true })
  if (!player.role) return res.status(200).json({ role: null })

  // Tandai role sudah dilihat (mencegah reload untuk cheat)
  await markRoleViewed(upperCode, playerId)

  return res.status(200).json({
    role: player.role,
    playerName: player.name,
  })
}
