import { getRoom, getPlayers, addPlayer, createSessionToken } from '../../../lib/redis'
import { broadcast, EVENTS } from '../../../lib/pusher'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, playerName, playerId, sessionToken } = req.body

  if (!code || !playerName || !playerId || !sessionToken) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const upperCode = code.toUpperCase()
  const room = await getRoom(upperCode)
  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' })
  if (room.status !== 'lobby') return res.status(400).json({ error: 'Game sudah dimulai, tidak bisa join' })

  const players = await getPlayers(upperCode)
  if (players.length >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room sudah penuh' })
  }

  // Cek nama duplikat
  if (players.find(p => p.name.toLowerCase() === playerName.toLowerCase())) {
    return res.status(400).json({ error: 'Nama sudah dipakai pemain lain' })
  }

  const newPlayer = {
    id: playerId,
    name: playerName,
    isHost: false,
    role: null,
    eliminated: false,
    joinedAt: Date.now(),
  }

  const updatedPlayers = await addPlayer(upperCode, newPlayer)

  // Simpan session token ke Redis (anti-cheat)
  await createSessionToken(upperCode, playerId, sessionToken)

  await broadcast(upperCode, EVENTS.PLAYER_JOINED, {
    player: newPlayer,
    players: updatedPlayers,
  })

  return res.status(200).json({ success: true, room, players: updatedPlayers })
}
