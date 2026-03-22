import { getRoom, getPlayers, getGameState } from '../../../lib/redis'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'Missing room code' })

  const [room, players, gameState] = await Promise.all([
    getRoom(code.toUpperCase()),
    getPlayers(code.toUpperCase()),
    getGameState(code.toUpperCase()),
  ])

  if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' })

  return res.status(200).json({ room, players, gameState })
}
