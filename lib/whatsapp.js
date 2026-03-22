export function formatRoleMessage(playerName, role, roomCode, description) {
  const roleEmojis = {
    werewolf: '🐺', seer: '🔮', guard: '🛡️',
    witcher: '🧙', drunk: '🍺', lycan: '🌕', villager: '👨‍🌾',
  }
  const roleNames = {
    werewolf: 'WEREWOLF', seer: 'SEER', guard: 'GUARD',
    witcher: 'WITCHER', drunk: 'DRUNK', lycan: 'LYCAN', villager: 'VILLAGER',
  }
  const emoji = roleEmojis[role] || '❓'
  const roleName = roleNames[role] || role.toUpperCase()

  return `🎭 *WEREWOLF GAME*
━━━━━━━━━━━━━━━━━━
🏠 Room: *${roomCode}*

Halo *${playerName}*! 👋

${emoji} Role kamu: *${roleName}*

📖 ${description}

⚠️ *RAHASIAKAN role-mu!*
Jangan beritahu siapapun.

Selamat bermain! 🐺🌕
━━━━━━━━━━━━━━━━━━`
}

export async function sendWhatsApp(phoneNumber, message) {
  const token = process.env.FONNTE_TOKEN
  if (!token) {
    console.warn('FONNTE_TOKEN not set, skipping WA send')
    return { success: false, error: 'No WA token configured' }
  }

  // Format phone: remove leading 0, add 62 if not present
  let phone = phoneNumber.replace(/\D/g, '')
  if (phone.startsWith('0')) phone = '62' + phone.slice(1)
  if (!phone.startsWith('62')) phone = '62' + phone

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        target: phone,
        message: message,
        countryCode: '62',
      }),
    })

    const result = await response.json()
    return { success: result.status === true, data: result }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false, error: error.message }
  }
}

export function validatePhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 15
}
