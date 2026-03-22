import { getRoom, getPlayers, getGameState, getVotes, saveVotes, updatePlayers, updateGameState, clearVotes } from '../../../lib/redis'
import { broadcast, EVENTS } from '../../../lib/pusher'
import { checkWinCondition } from '../../../lib/roles'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, voterId, targetId, isSkip } = req.body

  const [room, players, gameState, currentVotes] = await Promise.all([
    getRoom(code),
    getPlayers(code),
    getGameState(code),
    getVotes(code),
  ])

  if (!gameState || gameState.phase !== 'day') {
    return res.status(400).json({ error: 'Bukan fase voting' })
  }

  // ── SKIP VOTE (host only) ──────────────────────────────────
  if (isSkip) {
    if (!room || room.hostId !== voterId) {
      return res.status(403).json({ error: 'Hanya host yang bisa skip voting' })
    }

    const newRound = (gameState.round || 1) + 1
    const newState = { ...gameState, phase: 'night', round: newRound }

    await Promise.all([
      updateGameState(code, newState),
      clearVotes(code),
    ])

    await broadcast(code, EVENTS.PHASE_CHANGED, {
      phase: 'night',
      round: newRound,
      skipped: true,
    })

    return res.status(200).json({ resolved: true, skipped: true })
  }

  // ── CAST VOTE ─────────────────────────────────────────────
  // Host tidak boleh vote
  const voter = players.find(p => p.id === voterId && !p.eliminated && !p.isHost)
  if (!voter) return res.status(403).json({ error: 'Kamu tidak bisa vote (sudah eliminated atau host)' })

  // Cek sudah vote belum
  if (currentVotes[voterId]) {
    return res.status(400).json({ error: 'Kamu sudah vote' })
  }

  const target = players.find(p => p.id === targetId && !p.eliminated && !p.isHost)
  if (!target) return res.status(400).json({ error: 'Target tidak valid' })

  const updatedVotes = { ...currentVotes, [voterId]: targetId }
  await saveVotes(code, updatedVotes)

  const alivePlayers = players.filter(p => !p.eliminated && !p.isHost)
  const voteCount = Object.keys(updatedVotes).length

  await broadcast(code, EVENTS.VOTE_CAST, {
    voterId,
    voterName: voter.name,
    targetId,
    targetName: target.name,
    voteCount,
    totalAlive: alivePlayers.length,
  })

  // Auto-resolve jika semua sudah vote
  if (voteCount >= alivePlayers.length) {
    return await resolveVoting(code, players, gameState, updatedVotes, res)
  }

  return res.status(200).json({ resolved: false, voteCount, totalAlive: alivePlayers.length })
}

async function resolveVoting(code, players, gameState, votes, res) {
  // Hitung votes
  const tally = {}
  for (const [, target] of Object.entries(votes)) {
    tally[target] = (tally[target] || 0) + 1
  }

  const maxVotes = Math.max(...Object.values(tally))
  const topCandidates = Object.entries(tally).filter(([, v]) => v === maxVotes)

  let updatedPlayers = [...players]
  let eliminatedPlayer = null
  const isTie = topCandidates.length > 1

  // Jika seri → tidak ada yang dieliminasi
  if (!isTie) {
    const elimIdx = updatedPlayers.findIndex(p => p.id === topCandidates[0][0])
    if (elimIdx !== -1) {
      updatedPlayers[elimIdx] = { ...updatedPlayers[elimIdx], eliminated: true }
      eliminatedPlayer = updatedPlayers[elimIdx]
    }
  }

  const winner = checkWinCondition(updatedPlayers)
  const newPhase = winner ? 'ended' : 'night'
  const newRound = winner ? gameState.round : (gameState.round || 1) + 1

  const newState = { ...gameState, phase: newPhase, round: newRound, winner }

  await Promise.all([
    updatePlayers(code, updatedPlayers),
    updateGameState(code, newState),
    clearVotes(code),
  ])

  if (winner) {
    await broadcast(code, EVENTS.GAME_ENDED, { winner, players: updatedPlayers })
  } else {
    await broadcast(code, EVENTS.PLAYER_ELIMINATED, {
      player: eliminatedPlayer,
      players: updatedPlayers,
      tie: isTie,
    })
    await broadcast(code, EVENTS.PHASE_CHANGED, { phase: 'night', round: newRound })
  }

  return res.status(200).json({
    resolved: true,
    eliminated: eliminatedPlayer,
    tie: isTie,
    winner,
  })
}
