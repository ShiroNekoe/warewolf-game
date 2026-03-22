import Pusher from 'pusher'
import PusherClient from 'pusher-js'

// Server-side Pusher
export function getPusherServer() {
  return new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    useTLS: true,
  })
}

// Client-side Pusher
let clientInstance = null
export function getPusherClient() {
  if (!clientInstance && typeof window !== 'undefined') {
    clientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1',
    })
  }
  return clientInstance
}

// Broadcast helper
export async function broadcast(roomCode, event, data) {
  const pusher = getPusherServer()
  await pusher.trigger(`room-${roomCode}`, event, data)
}

// Event names
export const EVENTS = {
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  GAME_STARTED: 'game-started',
  PHASE_CHANGED: 'phase-changed',
  VOTE_CAST: 'vote-cast',
  PLAYER_ELIMINATED: 'player-eliminated',
  GAME_ENDED: 'game-ended',
  ROOM_UPDATED: 'room-updated',
  NIGHT_ACTION: 'night-action',
}
