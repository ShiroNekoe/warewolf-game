import { validateSessionToken } from '../../../lib/redis'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, playerId, sessionToken } = req.body

  if (!code || !playerId || !sessionToken) {
    return res.status(400).json({ valid: false, error: 'Missing fields' })
  }

  try {
    const valid = await validateSessionToken(code.toUpperCase(), playerId, sessionToken)
    return res.status(200).json({ valid })
  } catch (err) {
    return res.status(200).json({ valid: false })
  }
}
