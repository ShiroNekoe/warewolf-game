import { createRoom, getRoom, addPlayer, createSessionToken } from '../../../lib/redis'
import { generateRoomCode } from '../../../lib/roles'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { roomName, hostName, maxPlayers, hostId, sessionToken } = req.body

  if (!roomName || !hostName || !maxPlayers || !hostId || !sessionToken) {
    return res.status(400).json({ error: 'Missing required fields' })
  }
  if (maxPlayers < 5 || maxPlayers > 30) {
    return res.status(400).json({ error: 'Player count must be between 5 and 30' })
  }

  // Generate unique code
  let code
  let attempts = 0
  do {
    code = generateRoomCode()
    const existing = await getRoom(code)
    if (!existing) break
    attempts++
  } while (attempts < 10)

  const roomData = {
    code,
    name: roomName,
    hostId,
    maxPlayers: parseInt(maxPlayers),
    status: 'lobby',
    roleMode: 'auto',
    customRoles: null,
    createdAt: Date.now(),
  }

  await createRoom(code, roomData)

  // Host sebagai moderator — role: 'host'
  const hostPlayer = {
    id: hostId,
    name: hostName,
    isHost: true,
    role: 'host',
    eliminated: false,
    joinedAt: Date.now(),
  }
  await addPlayer(code, hostPlayer)

  // Simpan session token host ke Redis (anti-cheat/refresh)
  await createSessionToken(code, hostId, sessionToken)

  return res.status(200).json({ success: true, code, room: roomData })
}
