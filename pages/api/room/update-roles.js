import { getRoom, updateRoom } from '../../../lib/redis'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { code, hostId, roleMode, customRoles } = req.body
  const room = await getRoom(code)
  if (!room) return res.status(404).json({ error: 'Room not found' })
  if (room.hostId !== hostId) return res.status(403).json({ error: 'Only host can update roles' })
  await updateRoom(code, { ...room, roleMode, customRoles })
  return res.status(200).json({ success: true })
}
