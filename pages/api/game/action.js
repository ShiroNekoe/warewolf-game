import { getRoom, getPlayers, getGameState, updateGameState, updatePlayers, clearVotes } from '../../../lib/redis'
import { broadcast, EVENTS } from '../../../lib/pusher'
import { checkWinCondition } from '../../../lib/roles'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, action, actorId, targetId } = req.body

  const [room, players, gameState] = await Promise.all([
    getRoom(code),
    getPlayers(code),
    getGameState(code),
  ])

  if (!room || !gameState) return res.status(404).json({ error: 'Room tidak ditemukan' })

  const actor = players.find(p => p.id === actorId)
  if (!actor) return res.status(403).json({ error: 'Player tidak ditemukan' })

  let newState = { ...gameState }

  switch (action) {
    // ── WEREWOLF PILIH TARGET ─────────────────────────────
    case 'werewolf_kill': {
      if (actor.role !== 'werewolf') return res.status(403).json({ error: 'Bukan werewolf' })
      if (actor.eliminated) return res.status(403).json({ error: 'Kamu sudah eliminated' })
      if (gameState.phase !== 'night') return res.status(400).json({ error: 'Bukan fase malam' })
      const target = players.find(p => p.id === targetId && !p.eliminated && !p.isHost)
      if (!target) return res.status(400).json({ error: 'Target tidak valid' })
      newState.nightKill = targetId
      await updateGameState(code, newState)
      await broadcast(code, EVENTS.NIGHT_ACTION, { action: 'werewolf_voted' })
      return res.status(200).json({ success: true })
    }

    // ── SEER CEK IDENTITAS ───────────────────────────────
    case 'seer_check': {
      if (actor.role !== 'seer') return res.status(403).json({ error: 'Bukan seer' })
      if (actor.eliminated) return res.status(403).json({ error: 'Kamu sudah eliminated' })
      const target = players.find(p => p.id === targetId)
      if (!target) return res.status(404).json({ error: 'Target tidak ditemukan' })
      // Lycan terlihat seperti werewolf bagi Seer
      const appearsAs = target.role === 'lycan' ? 'werewolf' : target.role
      return res.status(200).json({
        success: true,
        result: { isWerewolf: appearsAs === 'werewolf', role: appearsAs },
      })
    }

    // ── GUARD LINDUNGI ───────────────────────────────────
    case 'guard_protect': {
      if (actor.role !== 'guard') return res.status(403).json({ error: 'Bukan guard' })
      if (actor.eliminated) return res.status(403).json({ error: 'Kamu sudah eliminated' })
      const target = players.find(p => p.id === targetId && !p.eliminated)
      if (!target) return res.status(400).json({ error: 'Target tidak valid' })
      newState.guardedPlayer = targetId
      await updateGameState(code, newState)
      return res.status(200).json({ success: true })
    }

    // ── HOST AKHIRI MALAM ────────────────────────────────
    case 'resolve_night': {
      if (room.hostId !== actorId) return res.status(403).json({ error: 'Hanya host' })
      if (gameState.phase !== 'night') return res.status(400).json({ error: 'Bukan fase malam' })

      let updatedPlayers = [...players]
      let eliminated = null

      // Terapkan kill — tapi Guard melindungi targetnya
      if (newState.nightKill && newState.nightKill !== newState.guardedPlayer) {
        const killIdx = updatedPlayers.findIndex(p => p.id === newState.nightKill)
        if (killIdx !== -1 && !updatedPlayers[killIdx].eliminated) {
          updatedPlayers[killIdx] = { ...updatedPlayers[killIdx], eliminated: true }
          eliminated = updatedPlayers[killIdx]
          newState.eliminatedPlayers = [...(newState.eliminatedPlayers || []), newState.nightKill]
        }
      }

      // Cek kondisi menang
      const winner = checkWinCondition(updatedPlayers)
      newState.nightKill = null
      newState.guardedPlayer = null

      if (winner) {
        newState.winner = winner
        newState.phase = 'ended'
        await Promise.all([
          updatePlayers(code, updatedPlayers),
          updateGameState(code, newState),
        ])
        await broadcast(code, EVENTS.GAME_ENDED, { winner, players: updatedPlayers })
        return res.status(200).json({ success: true, winner, eliminated })
      }

      newState.phase = 'day'
      await Promise.all([
        updatePlayers(code, updatedPlayers),
        updateGameState(code, newState),
        clearVotes(code),
      ])
      await broadcast(code, EVENTS.PHASE_CHANGED, {
        phase: 'day',
        round: newState.round,
        eliminated,
      })
      return res.status(200).json({ success: true, eliminated })
    }

    // ── HOST PAKSA LANJUT KE MALAM (setelah voting manual) ─
    case 'resolve_day': {
      if (room.hostId !== actorId) return res.status(403).json({ error: 'Hanya host' })
      newState.phase = 'night'
      newState.round = (newState.round || 1) + 1
      await updateGameState(code, newState)
      await clearVotes(code)
      await broadcast(code, EVENTS.PHASE_CHANGED, { phase: 'night', round: newState.round })
      return res.status(200).json({ success: true })
    }

    default:
      return res.status(400).json({ error: 'Aksi tidak dikenal' })
  }
}
