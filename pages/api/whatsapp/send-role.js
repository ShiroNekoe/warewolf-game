import { getPlayers, getWaNumbers } from '../../../lib/redis'
import { sendWhatsApp, formatRoleMessage } from '../../../lib/whatsapp'
import { ROLES } from '../../../lib/roles'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { code, playerId } = req.body
  
  const [players, waNumbers] = await Promise.all([getPlayers(code), getWaNumbers(code)])
  const player = players.find(p => p.id === playerId)
  const phone = waNumbers[playerId]
  
  if (!player || !phone || !player.role) {
    return res.status(400).json({ error: 'Player or role not found' })
  }
  
  const roleData = ROLES[player.role.toUpperCase()]
  const message = formatRoleMessage(player.name, player.role, code, roleData?.description || '')
  const result = await sendWhatsApp(phone, message)
  
  return res.status(200).json(result)
}
