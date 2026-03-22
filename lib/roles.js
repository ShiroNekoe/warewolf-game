export const ROLES = {
  WEREWOLF: { id: 'werewolf', name: 'Werewolf', emoji: '🐺', team: 'evil', description: 'Bunuh satu warga tiap malam. Sembunyikan identitasmu!', color: '#c0392b' },
  SEER: { id: 'seer', name: 'Seer', emoji: '🔮', team: 'good', description: 'Tiap malam, kamu bisa melihat identitas asli satu pemain.', color: '#8e44ad' },
  GUARD: { id: 'guard', name: 'Guard', emoji: '🛡️', team: 'good', description: 'Tiap malam, lindungi satu pemain dari serangan Werewolf.', color: '#2980b9' },
  WITCHER: { id: 'witcher', name: 'Witcher', emoji: '🧙', team: 'good', description: 'Punya ramuan racun dan penyembuh. Gunakan sekali masing-masing.', color: '#16a085' },
  DRUNK: { id: 'drunk', name: 'Drunk', emoji: '🍺', team: 'good', description: 'Kamu mabuk dan punya peran random yang berubah tiap babak.', color: '#d35400' },
  LYCAN: { id: 'lycan', name: 'Lycan', emoji: '🌕', team: 'good', description: 'Kamu warga biasa, tapi Seer akan melihatmu sebagai Werewolf!', color: '#f39c12' },
  VILLAGER: { id: 'villager', name: 'Villager', emoji: '👨‍🌾', team: 'good', description: 'Tidak punya kemampuan khusus. Andalkan diskusi dan votingmu!', color: '#27ae60' },
  HOST: { id: 'host', name: 'Moderator', emoji: '🎩', team: 'neutral', description: 'Kamu adalah Moderator. Jalankan permainan, jangan ikut bermain!', color: '#95a5a6' },
}

export function autoScaleRoles(playerCount) {
  // playerCount di sini = jumlah NON-HOST players
  const roles = []

  const werewolfCount = Math.max(1, Math.round(playerCount * 0.25))
  for (let i = 0; i < werewolfCount; i++) roles.push('werewolf')

  roles.push('seer')
  if (playerCount >= 10) roles.push('seer')

  roles.push('guard')

  if (playerCount >= 7) roles.push('witcher')
  if (playerCount >= 8) roles.push('drunk')
  if (playerCount >= 6) roles.push('lycan')

  while (roles.length < playerCount) roles.push('villager')

  return roles
}

export function assignRoles(players, roleList) {
  // Hanya assign ke NON-HOST players
  const nonHostPlayers = players.filter(p => !p.isHost)
  const hostPlayers = players.filter(p => p.isHost)

  const shuffled = [...roleList].sort(() => Math.random() - 0.5)
  const assigned = nonHostPlayers.map((player, i) => ({
    ...player,
    role: shuffled[i] || 'villager',
  }))

  // Host tetap role: host
  const hostsAssigned = hostPlayers.map(p => ({ ...p, role: 'host' }))

  return [...hostsAssigned, ...assigned]
}

export function validateRoles(roleConfig, playerCount) {
  // playerCount = total pemain TERMASUK host, tapi role hanya untuk non-host
  const total = Object.values(roleConfig).reduce((a, b) => a + b, 0)
  const errors = []
  if (total !== playerCount) errors.push(`Total role (${total}) harus sama dengan jumlah pemain non-host (${playerCount})`)
  if ((roleConfig.werewolf || 0) < 1) errors.push('Minimal 1 Werewolf')
  return errors
}

export function buildRoleArray(roleConfig) {
  const roles = []
  for (const [role, count] of Object.entries(roleConfig)) {
    for (let i = 0; i < count; i++) roles.push(role)
  }
  return roles
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'WOLF-'
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function checkWinCondition(players) {
  // Exclude host dari win condition
  const alive = players.filter(p => !p.eliminated && p.role !== 'host')
  const aliveWerewolves = alive.filter(p => p.role === 'werewolf')
  const aliveVillagers = alive.filter(p => p.role !== 'werewolf')

  if (aliveWerewolves.length === 0) return 'villagers'
  if (aliveWerewolves.length >= aliveVillagers.length) return 'werewolves'
  return null
}
