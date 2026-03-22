import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { getPusherClient, EVENTS } from '../../lib/pusher'
import { ROLES } from '../../lib/roles'

const ROLE_COLORS = {
  werewolf: '#c0392b', seer: '#8e44ad', guard: '#2980b9',
  witcher: '#16a085', drunk: '#d35400', lycan: '#f39c12',
  villager: '#27ae60', host: '#95a5a6',
}

// ── MODAL ROLE REVEAL ─────────────────────────────────────────────────────────
function RoleRevealModal({ role, playerName, onClose }) {
  const r = ROLES[role?.toUpperCase()]
  if (!r) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-sm text-center animate-slide-up"
        style={{
          background: 'linear-gradient(160deg, #120020 0%, #1c003a 100%)',
          border: `2px solid ${ROLE_COLORS[role] || '#555'}66`,
          borderRadius: '22px', padding: '40px 32px',
        }}>
        <p className="text-xs uppercase tracking-widest mb-5"
          style={{ color: '#9e8a6c', fontFamily: 'Cinzel, serif', letterSpacing: '0.25em' }}>
          🔐 Role Rahasia Kamu
        </p>
        <div className="text-8xl mb-5">{r.emoji}</div>
        <h2 className="text-3xl font-black mb-2"
          style={{ color: ROLE_COLORS[role], fontFamily: 'Cinzel, serif' }}>
          {r.name}
        </h2>
        <p className="mb-1 text-base" style={{ color: '#f5e6c8' }}>
          Halo, <strong>{playerName}</strong>!
        </p>
        <p className="text-sm mb-7"
          style={{ color: '#9e8a6c', fontStyle: 'italic', lineHeight: 1.6 }}>
          {r.description}
        </p>
        <div className="p-4 rounded-2xl mb-6 text-sm"
          style={{ background: 'rgba(192,57,43,0.12)', border: '1px solid rgba(192,57,43,0.35)', color: '#e8a090' }}>
          ⚠️ <strong>Hafalkan role-mu sekarang!</strong><br />
          Halaman tidak bisa di-refresh. Role hanya ditampilkan sekali.
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-xl btn-primary font-bold"
          style={{ borderRadius: '12px', fontSize: '1rem' }}>
          ✅ Sudah Hafal!
        </button>
      </div>
    </div>
  )
}

// ── BLOCKED PAGE ──────────────────────────────────────────────────────────────
function SessionBlockedPage({ reason }) {
  const router = useRouter()
  const msg = {
    refresh: {
      title: '🚫 Halaman Direfresh',
      desc: 'Kamu me-refresh halaman. Ini tidak diizinkan untuk mencegah kecurangan.',
      sub: 'Demi fairplay, kamu tidak bisa kembali ke room ini. Hubungi host atau buat game baru.',
    },
    invalid: {
      title: '🚫 Sesi Tidak Valid',
      desc: 'Sesi kamu tidak ditemukan atau sudah kedaluwarsa.',
      sub: 'Pastikan kamu join lewat halaman utama dengan kode room yang benar.',
    },
  }[reason] || {
    title: '🚫 Akses Ditolak',
    desc: 'Kamu tidak bisa mengakses halaman ini.',
    sub: '',
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(to bottom, #07000f, #1a0000)' }}>
      <div className="w-full max-w-sm text-center">
        <div className="text-7xl mb-6">🐺</div>
        <h1 className="text-2xl font-black mb-3"
          style={{ color: '#c0392b', fontFamily: 'Cinzel, serif' }}>
          {msg.title}
        </h1>
        <p className="mb-2" style={{ color: '#f5e6c8', lineHeight: 1.6 }}>{msg.desc}</p>
        <p className="text-sm mb-8" style={{ color: '#9e8a6c' }}>{msg.sub}</p>
        <button onClick={() => router.push('/')} className="w-full py-3 rounded-xl btn-primary"
          style={{ borderRadius: '12px' }}>
          🏠 Kembali ke Beranda
        </button>
      </div>
    </div>
  )
}

// ── MAIN ROOM PAGE ────────────────────────────────────────────────────────────
export default function RoomPage() {
  const router = useRouter()
  const { code } = router.query

  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [gameState, setGameState] = useState(null)
  const [myPlayer, setMyPlayer] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [sessionToken, setSessionToken] = useState('')

  // Page state: loading | blocked-refresh | blocked-invalid | ok
  const [pageState, setPageState] = useState('loading')
  const [loading, setLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  // Voting
  const [myVote, setMyVote] = useState(null)
  const [voteLog, setVoteLog] = useState([])
  const [voteInfo, setVoteInfo] = useState({ count: 0, total: 0 })

  // Role modal (tampil sekali saat game mulai)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [myRole, setMyRole] = useState(null)
  const [roleRevealed, setRoleRevealed] = useState(false)

  // Night actions
  const [nightActions, setNightActions] = useState({})
  const [seerResult, setSeerResult] = useState(null)

  // Host role config
  const [roleMode, setRoleMode] = useState('auto')
  const [customRoles, setCustomRoles] = useState({
    werewolf: 1, seer: 1, guard: 1, witcher: 0, drunk: 0, lycan: 0, villager: 2,
  })
  const [roleErrors, setRoleErrors] = useState([])

  const initializedRef = useRef(false)

  // ── ANTI-REFRESH + SESSION CHECK ─────────────────────────────────────────
  useEffect(() => {
    if (!code || initializedRef.current) return
    initializedRef.current = true

    const id = sessionStorage.getItem('playerId')
    const name = sessionStorage.getItem('playerName')
    const host = sessionStorage.getItem('isHost') === 'true'
    const token = sessionStorage.getItem('sessionToken')
    const roomCode = sessionStorage.getItem('roomCode')
    const alreadyLoaded = sessionStorage.getItem(`loaded_${code}`)

    // Tidak ada session → belum pernah join dari halaman utama
    if (!id || !token) {
      setPageState('blocked-invalid')
      return
    }

    // Kode tidak cocok → mencoba akses room orang lain
    if (roomCode && roomCode !== code) {
      setPageState('blocked-invalid')
      return
    }

    // Sudah pernah load halaman ini → ini adalah REFRESH
    if (alreadyLoaded === '1') {
      setPageState('blocked-refresh')
      return
    }

    // Tandai halaman ini sudah di-load (pertama kali)
    sessionStorage.setItem(`loaded_${code}`, '1')

    setPlayerId(id)
    setIsHost(host)
    setSessionToken(token)

    // Verifikasi token ke server
    verifyAndLoad(code.toUpperCase(), id, token, host)
  }, [code])

  async function verifyAndLoad(roomCode, id, token) {
    try {
      const res = await fetch('/api/room/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: roomCode, playerId: id, sessionToken: token }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setPageState('blocked-invalid')
        return
      }
      setPageState('ok')
      await fetchState(roomCode)
    } catch {
      setPageState('blocked-invalid')
    }
  }

  // ── FETCH STATE ──────────────────────────────────────────────────────────
  const fetchState = useCallback(async (roomCode) => {
    const c = (roomCode || code || '').toUpperCase()
    if (!c) return
    try {
      const res = await fetch(`/api/room/status?code=${c}`)
      const data = await res.json()
      if (!res.ok) return
      setRoom(data.room)
      setPlayers(data.players || [])
      setGameState(data.gameState)
    } catch {}
  }, [code])

  // Update myPlayer
  useEffect(() => {
    if (playerId && players.length) {
      setMyPlayer(players.find(p => p.id === playerId) || null)
    }
  }, [players, playerId])

  // ── AMBIL ROLE DARI SERVER ────────────────────────────────────────────────
  async function fetchMyRole() {
    if (!code || !playerId || !sessionToken || isHost) return
    try {
      const res = await fetch('/api/game/get-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase(), playerId, sessionToken }),
      })
      const data = await res.json()
      if (res.ok && data.role && data.role !== 'host') {
        setMyRole(data.role)
        setShowRoleModal(true)
      }
    } catch {}
  }

  // ── PUSHER REALTIME ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!code || pageState !== 'ok') return
    const pusher = getPusherClient()
    if (!pusher) return
    const channel = pusher.subscribe(`room-${code}`)

    channel.bind(EVENTS.PLAYER_JOINED, ({ players: p }) => setPlayers(p))

    channel.bind(EVENTS.GAME_STARTED, () => {
      fetchState()
      fetchMyRole()
      setActionMsg('🎭 Game dimulai! Kamu akan melihat role-mu sebentar lagi...')
    })

    channel.bind(EVENTS.PHASE_CHANGED, ({ phase, round, eliminated, skipped }) => {
      setGameState(prev => ({ ...prev, phase, round }))
      setMyVote(null)
      setVoteLog([])
      setVoteInfo({ count: 0, total: 0 })
      setSeerResult(null)
      setNightActions({})
      if (skipped) setActionMsg('⏭️ Voting di-skip oleh Host. Lanjut ke malam berikutnya.')
      else if (eliminated) setActionMsg(`☠️ ${eliminated.name} tereliminasi! Round ${round}.`)
      else setActionMsg(phase === 'night' ? '🌙 Malam tiba... Semua tutup mata!' : '☀️ Siang hari! Diskusikan siapa yang curigai, lalu vote.')
      fetchState()
    })

    channel.bind(EVENTS.VOTE_CAST, (info) => {
      setVoteInfo({ count: info.voteCount, total: info.totalAlive })
      if (info.voterName && info.targetName) {
        setVoteLog(prev => [...prev, `${info.voterName} → ${info.targetName}`])
      }
    })

    channel.bind(EVENTS.PLAYER_ELIMINATED, ({ player, players: p, tie }) => {
      setPlayers(p)
      if (tie) setActionMsg('🤝 Hasil seri! Tidak ada yang dieliminasi ronde ini.')
      else if (player) setActionMsg(`☠️ ${player.name} telah tereliminasi!`)
    })

    channel.bind(EVENTS.GAME_ENDED, ({ winner, players: p }) => {
      setPlayers(p)
      setGameState(prev => ({ ...prev, winner, phase: 'ended' }))
      setActionMsg(winner === 'villagers'
        ? '🏆 Warga menang! Werewolf berhasil dikalahkan!'
        : '🐺 Werewolf menang! Desa dikuasai kegelapan!')
    })

    channel.bind(EVENTS.ROOM_UPDATED, () => fetchState())

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(`room-${code}`)
    }
  }, [code, pageState, playerId, sessionToken])

  // ── VALIDASI CUSTOM ROLES ─────────────────────────────────────────────────
  useEffect(() => {
    if (roleMode !== 'custom' || !room) return
    const nonHostCount = players.filter(p => !p.isHost).length || Math.max(1, room.maxPlayers - 1)
    const total = Object.values(customRoles).reduce((a, b) => a + b, 0)
    const errs = []
    if (total !== nonHostCount) errs.push(`Total ${total} ≠ ${nonHostCount} pemain`)
    if ((customRoles.werewolf || 0) < 1) errs.push('Min 1 Werewolf')
    setRoleErrors(errs)
  }, [customRoles, roleMode, room, players])

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  async function startGame() {
    setLoading(true)
    setActionMsg('')
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, hostId: playerId, roleMode, customRoles: roleMode === 'custom' ? customRoles : null }),
      })
      const data = await res.json()
      if (!res.ok) { setActionMsg('❌ ' + data.error); return }
      setActionMsg('✅ ' + data.message)
      fetchState()
    } catch { setActionMsg('❌ Gagal memulai game') }
    finally { setLoading(false) }
  }

  async function castVote(targetId) {
    if (myVote || myPlayer?.eliminated || isHost) return
    setMyVote(targetId)
    const res = await fetch('/api/game/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, voterId: playerId, targetId }),
    })
    const data = await res.json()
    if (!res.ok) { setMyVote(null); setActionMsg('❌ ' + data.error) }
  }

  async function skipVote() {
    if (!isHost) return
    const res = await fetch('/api/game/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, voterId: playerId, isSkip: true }),
    })
    if (!res.ok) { const d = await res.json(); setActionMsg('❌ ' + d.error) }
  }

  async function nightAction(action, targetId) {
    const res = await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, action, actorId: playerId, targetId }),
    })
    const data = await res.json()
    if (res.ok) {
      setNightActions(prev => ({ ...prev, [action]: targetId }))
      if (data.result) setSeerResult(data.result)
      setActionMsg('✅ Aksi malam dicatat!')
    } else {
      setActionMsg('❌ ' + data.error)
    }
  }

  async function resolvePhase(action) {
    const res = await fetch('/api/game/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, action, actorId: playerId }),
    })
    if (!res.ok) { const d = await res.json(); setActionMsg('❌ ' + d.error) }
  }

  // ── RENDER: LOADING / BLOCKED ─────────────────────────────────────────────
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07000f' }}>
        <div className="text-center">
          <div className="moon mx-auto mb-5" />
          <p style={{ color: '#9e8a6c', fontFamily: 'Cinzel, serif', letterSpacing: '0.1em' }}>
            Memverifikasi sesi...
          </p>
        </div>
      </div>
    )
  }
  if (pageState === 'blocked-refresh') return <SessionBlockedPage reason="refresh" />
  if (pageState === 'blocked-invalid') return <SessionBlockedPage reason="invalid" />
  if (!room) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#07000f' }}>
      <div className="moon mx-auto" />
    </div>
  )

  // ── COMPUTED VALUES ───────────────────────────────────────────────────────
  const alivePlayers = players.filter(p => !p.eliminated && !p.isHost)
  const nonHostPlayers = players.filter(p => !p.isHost)
  const phase = gameState?.phase || 'lobby'
  const isLobby = phase === 'lobby'
  const isNight = phase === 'night'
  const isDay = phase === 'day'
  const isEnded = phase === 'ended'
  const displayRole = myRole || myPlayer?.role

  const nightActionKey = displayRole === 'werewolf' ? 'werewolf_kill'
    : displayRole === 'seer' ? 'seer_check'
    : displayRole === 'guard' ? 'guard_protect'
    : null

  return (
    <div className="min-h-screen pb-8" style={{
      background: isDay
        ? 'linear-gradient(to bottom, #1a3a5c, #2d6a4f 60%, #1a3a1a)'
        : 'linear-gradient(to bottom, #07000f, #120020 50%, #07000f)',
      transition: 'background 1.5s ease',
    }}>
      {/* Role Reveal Modal */}
      {showRoleModal && myRole && !isHost && (
        <RoleRevealModal
          role={myRole}
          playerName={myPlayer?.name || ''}
          onClose={() => { setShowRoleModal(false); setRoleRevealed(true) }}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 px-4 py-3"
        style={{ background: 'rgba(7,0,15,0.94)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(245,230,200,0.07)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif', fontSize: '1rem' }}>
              {room.name}
            </h1>
            <p className="text-xs" style={{ color: '#9e8a6c' }}>
              {isLobby
                ? `${players.length}/${room.maxPlayers} pemain · ${nonHostPlayers.length} bermain`
                : `Round ${gameState?.round} · ${isDay ? '☀️ Siang' : isNight ? '🌙 Malam' : '🏁 Selesai'}`}
            </p>
          </div>
          <div className="text-right">
            <div className="font-black" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif', fontSize: '1rem', letterSpacing: '0.15em' }}>
              {code}
            </div>
            {isHost && (
              <p className="text-xs" style={{ color: '#95a5a6' }}>🎩 Moderator</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-4">

        {/* Phase Header */}
        {!isLobby && (
          <div className="text-center py-5 animate-fade-in">
            {isNight && <div className="moon mx-auto mb-3" style={{ width: 56, height: 56 }} />}
            {isDay && <div className="sun mx-auto mb-3" style={{ width: 56, height: 56 }} />}
            {isEnded && <div className="text-6xl mb-3">{gameState?.winner === 'villagers' ? '🏆' : '🐺'}</div>}
            <h2 className="font-black text-2xl" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif' }}>
              {isNight ? 'Malam Mencekam' : isDay ? 'Siang Hari' : gameState?.winner === 'villagers' ? 'Warga Menang!' : 'Werewolf Menang!'}
            </h2>
          </div>
        )}

        {/* Action Message */}
        {actionMsg && (
          <div className="text-center py-3 px-4 rounded-2xl text-sm animate-fade-in"
            style={{ background: 'rgba(245,230,200,0.06)', border: '1px solid rgba(245,230,200,0.1)', color: '#f5e6c8', borderRadius: '12px' }}>
            {actionMsg}
          </div>
        )}

        {/* ── GAME ENDED ── */}
        {isEnded && (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(18,0,32,0.88)', border: '1px solid rgba(245,230,200,0.12)', borderRadius: '18px' }}>
            <p className="text-sm text-center mb-4" style={{ color: '#9e8a6c' }}>
              Identitas semua pemain terungkap:
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {players.filter(p => !p.isHost).map(p => {
                const r = ROLES[p.role?.toUpperCase()]
                return (
                  <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ background: 'rgba(7,0,15,0.6)', border: `1px solid ${ROLE_COLORS[p.role] || '#333'}33` }}>
                    <span>{r?.emoji}</span>
                    <span style={{ color: p.eliminated ? '#6b5d47' : '#f5e6c8' }}>{p.name}</span>
                    {p.eliminated && <span style={{ color: '#c0392b' }}>☠</span>}
                    <span className="ml-auto text-xs" style={{ color: ROLE_COLORS[p.role] }}>{r?.name}</span>
                  </div>
                )
              })}
            </div>
            <button onClick={() => router.push('/')} className="w-full py-3 rounded-xl btn-secondary"
              style={{ borderRadius: '12px' }}>
              🏠 Main Lagi
            </button>
          </div>
        )}

        {/* ── MY ROLE CARD (setelah modal ditutup) ── */}
        {!isLobby && !isEnded && !isHost && displayRole && displayRole !== 'host' && roleRevealed && (
          <div className="rounded-2xl p-4 flex items-center gap-4"
            style={{
              background: 'rgba(18,0,32,0.75)',
              border: `1px solid ${ROLE_COLORS[displayRole] || '#555'}44`,
              borderRadius: '14px',
            }}>
            <div className="text-4xl flex-shrink-0">{ROLES[displayRole?.toUpperCase()]?.emoji}</div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest" style={{ color: '#9e8a6c', fontFamily: 'Cinzel, serif' }}>
                Role Kamu
              </p>
              <p className="font-black text-lg" style={{ color: ROLE_COLORS[displayRole], fontFamily: 'Cinzel, serif' }}>
                {ROLES[displayRole?.toUpperCase()]?.name}
              </p>
              <p className="text-xs truncate" style={{ color: '#9e8a6c' }}>
                {ROLES[displayRole?.toUpperCase()]?.description}
              </p>
            </div>
            {myPlayer?.eliminated && (
              <span className="flex-shrink-0 text-xs px-2 py-1 rounded-lg ml-auto"
                style={{ background: 'rgba(192,57,43,0.2)', color: '#c0392b' }}>
                ☠️ Eliminated
              </span>
            )}
          </div>
        )}

        {/* ── HOST MODERATOR PANEL ── */}
        {isHost && isNight && !isEnded && (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(18,0,32,0.85)', border: '1px solid rgba(149,165,166,0.2)', borderRadius: '18px' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#95a5a6', fontFamily: 'Cinzel, serif' }}>
              🎩 Moderator — Kontrol Malam
            </p>
            <p className="text-sm mb-4" style={{ color: '#9e8a6c', lineHeight: 1.6 }}>
              Instruksikan pemain untuk melakukan aksi malam mereka masing-masing secara diam-diam.
              Saat selesai, klik tombol di bawah.
            </p>
            <button onClick={() => resolvePhase('resolve_night')}
              className="w-full py-3 rounded-xl btn-primary font-bold"
              style={{ borderRadius: '12px' }}>
              ☀️ Akhiri Malam & Lanjut ke Siang
            </button>
          </div>
        )}

        {isHost && isDay && !isEnded && (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(18,0,32,0.85)', border: '1px solid rgba(149,165,166,0.2)', borderRadius: '18px' }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#95a5a6', fontFamily: 'Cinzel, serif' }}>
              🎩 Moderator — Kontrol Siang
            </p>
            <p className="text-sm mb-4" style={{ color: '#9e8a6c' }}>
              Biarkan pemain berdiskusi & voting. Atau skip jika tidak ada kesepakatan.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={skipVote} className="py-3 rounded-xl btn-secondary text-sm font-semibold"
                style={{ borderRadius: '12px' }}>
                ⏭️ Skip Voting
              </button>
              <button onClick={() => resolvePhase('resolve_day')} className="py-3 rounded-xl text-sm font-semibold"
                style={{
                  borderRadius: '12px', cursor: 'pointer',
                  background: 'rgba(7,0,15,0.5)', border: '1px solid rgba(245,230,200,0.12)',
                  color: '#9e8a6c',
                }}>
                🌙 Paksa ke Malam
              </button>
            </div>
          </div>
        )}

        {/* ── NIGHT ACTIONS (non-host players) ── */}
        {isNight && !isHost && myPlayer && !myPlayer.eliminated && (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(18,0,32,0.85)', border: '1px solid rgba(245,230,200,0.1)', borderRadius: '18px' }}>
            {nightActionKey ? (
              <>
                <p className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: '#9e8a6c', fontFamily: 'Cinzel, serif' }}>
                  {displayRole === 'werewolf' ? '🐺 Pilih Target Serangan'
                    : displayRole === 'seer' ? '🔮 Cek Identitas Pemain'
                    : '🛡️ Pilih Pemain yang Dilindungi'}
                </p>
                <div className="space-y-2">
                  {alivePlayers.filter(p => p.id !== playerId).map(p => {
                    const isChosen = nightActions[nightActionKey] === p.id
                    return (
                      <button key={p.id} onClick={() => nightAction(nightActionKey, p.id)}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                        style={{
                          borderRadius: '10px',
                          background: isChosen ? 'rgba(192,57,43,0.18)' : 'rgba(7,0,15,0.5)',
                          border: `1px solid ${isChosen ? '#c0392b' : 'rgba(245,230,200,0.1)'}`,
                          color: '#f5e6c8', cursor: 'pointer',
                        }}>
                        {p.name} {isChosen ? '✓' : ''}
                      </button>
                    )
                  })}
                </div>
                {seerResult && (
                  <div className="mt-4 p-3 rounded-xl text-sm text-center"
                    style={{
                      background: seerResult.isWerewolf ? 'rgba(192,57,43,0.18)' : 'rgba(39,174,96,0.15)',
                      border: `1px solid ${seerResult.isWerewolf ? '#c0392b' : '#27ae60'}44`,
                      color: seerResult.isWerewolf ? '#e88' : '#6ce',
                    }}>
                    {seerResult.isWerewolf ? '⚠️ Pemain itu adalah WEREWOLF!' : '✅ Pemain itu BUKAN Werewolf'}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🌙</div>
                <p className="text-sm" style={{ color: '#9e8a6c' }}>Tutup mata dan tunggu hingga siang...</p>
                <p className="text-xs mt-1" style={{ color: '#4a3d2e' }}>Role kamu tidak memiliki aksi malam</p>
              </div>
            )}
          </div>
        )}

        {/* Eliminated notice during night */}
        {isNight && !isHost && myPlayer?.eliminated && (
          <div className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(18,0,32,0.6)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '16px' }}>
            <p className="text-sm" style={{ color: '#9e8a6c' }}>☠️ Kamu sudah eliminated. Saksikan jalannya malam...</p>
          </div>
        )}

        {/* ── DAY VOTING ── */}
        {isDay && !isEnded && (
          <div className="rounded-2xl p-5"
            style={{ background: 'rgba(18,0,32,0.85)', border: '1px solid rgba(245,230,200,0.1)', borderRadius: '18px' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif' }}>🗳️ Voting</h3>
              <span className="text-sm px-3 py-1 rounded-full"
                style={{ background: 'rgba(245,230,200,0.08)', color: '#9e8a6c' }}>
                {voteInfo.count}/{voteInfo.total} vote
              </span>
            </div>

            {/* Vote log */}
            {voteLog.length > 0 && (
              <div className="mb-4 p-3 rounded-xl text-xs space-y-1"
                style={{ background: 'rgba(7,0,15,0.5)', border: '1px solid rgba(245,230,200,0.07)', maxHeight: 110, overflowY: 'auto' }}>
                {voteLog.map((log, i) => (
                  <p key={i} style={{ color: '#9e8a6c' }}>• {log}</p>
                ))}
              </div>
            )}

            {/* Voting buttons */}
            {myPlayer && !myPlayer.eliminated && !isHost ? (
              <div className="space-y-2">
                <p className="text-xs mb-3" style={{ color: '#9e8a6c' }}>
                  {myVote ? '✓ Vote-mu sudah tercatat' : 'Pilih siapa yang paling kamu curigai:'}
                </p>
                {alivePlayers.filter(p => p.id !== playerId).map(p => (
                  <button key={p.id} onClick={() => castVote(p.id)}
                    disabled={!!myVote}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      borderRadius: '10px',
                      background: myVote === p.id ? 'rgba(192,57,43,0.2)' : 'rgba(7,0,15,0.5)',
                      border: `1px solid ${myVote === p.id ? '#c0392b' : 'rgba(245,230,200,0.1)'}`,
                      color: myVote && myVote !== p.id ? '#4a3d2e' : '#f5e6c8',
                      cursor: myVote ? 'not-allowed' : 'pointer',
                    }}>
                    {p.name} {myVote === p.id ? '← Pilihanmu ✓' : ''}
                  </button>
                ))}
              </div>
            ) : myPlayer?.eliminated ? (
              <p className="text-sm text-center py-2" style={{ color: '#9e8a6c' }}>
                ☠️ Kamu eliminated. Silakan tonton voting berlangsung.
              </p>
            ) : isHost ? (
              <p className="text-sm text-center py-2" style={{ color: '#9e8a6c' }}>
                🎩 Host tidak ikut voting. Gunakan tombol Skip di panel Moderator.
              </p>
            ) : null}
          </div>
        )}

        {/* ── LOBBY ── */}
        {isLobby && (
          <div className="space-y-4">
            {/* Player list */}
            <div className="rounded-2xl p-5"
              style={{ background: 'rgba(18,0,32,0.85)', border: '1px solid rgba(245,230,200,0.1)', borderRadius: '18px' }}>
              <h3 className="font-bold mb-4" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif' }}>
                👥 Pemain ({players.length}/{room.maxPlayers})
              </h3>
              <div className="space-y-2">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(7,0,15,0.45)', border: '1px solid rgba(245,230,200,0.07)' }}>
                    <span style={{ color: '#4a3d2e', fontSize: '0.8rem', minWidth: 20 }}>{i + 1}</span>
                    <span style={{ color: '#f5e6c8' }}>{p.name}</span>
                    {p.isHost && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-lg"
                        style={{ background: 'rgba(149,165,166,0.15)', color: '#95a5a6', fontFamily: 'Cinzel, serif' }}>
                        🎩 HOST
                      </span>
                    )}
                    {p.id === playerId && !p.isHost && (
                      <span className="ml-auto text-xs" style={{ color: '#6b5d47' }}>Kamu</span>
                    )}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, room.maxPlayers - players.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="px-3 py-2.5 rounded-xl text-sm"
                    style={{ border: '1px dashed rgba(245,230,200,0.07)', color: '#3a2d1e' }}>
                    Menunggu pemain...
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl text-sm text-center"
                style={{ background: 'rgba(7,0,15,0.45)', color: '#9e8a6c' }}>
                Bagikan kode:{' '}
                <span className="font-black" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif', letterSpacing: '0.15em' }}>
                  {code}
                </span>
              </div>
            </div>

            {/* Warning untuk non-host */}
            {!isHost && (
              <div className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', color: '#e8a090', borderRadius: '12px' }}>
                ⚠️ <strong>Jangan refresh halaman!</strong> Kamu tidak bisa kembali ke room ini setelah refresh.
              </div>
            )}

            {/* Host: role config */}
            {isHost && (
              <div className="rounded-2xl p-5"
                style={{ background: 'rgba(18,0,32,0.85)', border: '1px solid rgba(149,165,166,0.15)', borderRadius: '18px' }}>
                <h3 className="font-bold mb-1" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif' }}>🎭 Setup Role</h3>
                <p className="text-xs mb-5" style={{ color: '#6b5d47' }}>
                  Host ({players.find(p => p.isHost)?.name}) adalah Moderator dan tidak mendapat role pemain.
                </p>

                {/* Mode toggle */}
                <div className="flex gap-2 mb-5">
                  {['auto', 'custom'].map(m => (
                    <button key={m} onClick={() => setRoleMode(m)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{
                        borderRadius: '10px', cursor: 'pointer',
                        background: roleMode === m ? 'rgba(192,57,43,0.2)' : 'rgba(7,0,15,0.4)',
                        border: `1px solid ${roleMode === m ? '#c0392b' : 'rgba(245,230,200,0.1)'}`,
                        color: roleMode === m ? '#f5e6c8' : '#9e8a6c',
                        fontFamily: 'Cinzel, serif',
                      }}>
                      {m === 'auto' ? '⚡ Auto' : '✏️ Custom'}
                    </button>
                  ))}
                </div>

                {/* Auto mode info */}
                {roleMode === 'auto' && (
                  <div className="space-y-2 text-sm" style={{ color: '#9e8a6c' }}>
                    {[
                      ['🐺', 'Werewolf', '≈ 25% pemain'],
                      ['🔮', 'Seer', '= 1 (2 jika ≥10)'],
                      ['🛡️', 'Guard', '= 1'],
                      ['🧙', 'Witcher', 'aktif jika ≥7 pemain'],
                      ['🍺', 'Drunk', 'aktif jika ≥8 pemain'],
                      ['🌕', 'Lycan', 'aktif jika ≥6 pemain'],
                      ['👨‍🌾', 'Villager', 'sisa pemain'],
                    ].map(([e, name, desc]) => (
                      <div key={name} className="flex items-center gap-2">
                        <span>{e}</span>
                        <span style={{ color: '#f5e6c8' }}>{name}</span>
                        <span className="ml-auto text-xs">{desc}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom mode */}
                {roleMode === 'custom' && (
                  <div className="space-y-3">
                    <p className="text-xs" style={{ color: '#9e8a6c' }}>
                      Total harus = <strong style={{ color: '#f5e6c8' }}>
                        {players.filter(p => !p.isHost).length || Math.max(1, room.maxPlayers - 1)}
                      </strong> pemain (non-host)
                    </p>
                    {Object.entries(customRoles).map(([role, count]) => {
                      const r = ROLES[role.toUpperCase()]
                      return (
                        <div key={role} className="flex items-center gap-3">
                          <span className="w-6 text-center text-lg">{r?.emoji}</span>
                          <span className="flex-1 text-sm" style={{ color: '#f5e6c8' }}>{r?.name}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setCustomRoles(p => ({ ...p, [role]: Math.max(0, p[role] - 1) }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                              style={{ background: 'rgba(7,0,15,0.6)', border: '1px solid rgba(245,230,200,0.15)', color: '#f5e6c8', cursor: 'pointer' }}>
                              −
                            </button>
                            <span className="w-6 text-center text-sm" style={{ color: '#f5e6c8' }}>{count}</span>
                            <button onClick={() => setCustomRoles(p => ({ ...p, [role]: p[role] + 1 }))}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                              style={{ background: 'rgba(7,0,15,0.6)', border: '1px solid rgba(245,230,200,0.15)', color: '#f5e6c8', cursor: 'pointer' }}>
                              +
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    {roleErrors.map((e, i) => (
                      <p key={i} className="text-xs" style={{ color: '#c0392b' }}>⚠️ {e}</p>
                    ))}
                  </div>
                )}

                <button
                  onClick={startGame}
                  disabled={nonHostPlayers.length < 4 || loading || (roleMode === 'custom' && roleErrors.length > 0)}
                  className="w-full py-4 mt-6 rounded-xl btn-primary font-bold text-base"
                  style={{ borderRadius: '12px' }}>
                  {loading
                    ? '⏳ Memulai...'
                    : nonHostPlayers.length < 4
                    ? `Butuh ${4 - nonHostPlayers.length} pemain lagi`
                    : `🚀 Mulai Game! (${nonHostPlayers.length} pemain)`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PLAYER STATUS (in-game) ── */}
        {!isLobby && !isEnded && (
          <div className="rounded-2xl p-4"
            style={{ background: 'rgba(18,0,32,0.65)', border: '1px solid rgba(245,230,200,0.07)', borderRadius: '16px' }}>
            <h4 className="text-xs font-bold mb-3 uppercase tracking-widest"
              style={{ color: '#6b5d47', fontFamily: 'Cinzel, serif' }}>
              Status Pemain
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {players.filter(p => !p.isHost).map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                  style={{
                    background: 'rgba(7,0,15,0.4)',
                    border: `1px solid ${p.eliminated ? 'rgba(192,57,43,0.25)' : 'rgba(245,230,200,0.06)'}`,
                    opacity: p.eliminated ? 0.45 : 1,
                  }}>
                  <span className="text-base">{p.eliminated ? '💀' : '❤️'}</span>
                  <span className="truncate" style={{ color: p.eliminated ? '#6b5d47' : '#f5e6c8' }}>
                    {p.name}
                  </span>
                  {p.id === playerId && (
                    <span className="ml-auto text-xs flex-shrink-0" style={{ color: '#4a3d2e' }}>kamu</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
