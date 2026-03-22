import { useState } from 'react'
import { useRouter } from 'next/router'

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
}

export default function Home() {
  const router = useRouter()
  const [tab, setTab] = useState('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [createForm, setCreateForm] = useState({ roomName: '', hostName: '', maxPlayers: 8 })
  const [joinForm, setJoinForm] = useState({ code: '', playerName: '' })

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const hostId = generateId()
      const sessionToken = generateSessionToken()
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: createForm.roomName,
          hostName: createForm.hostName,
          maxPlayers: createForm.maxPlayers,
          hostId,
          sessionToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Simpan di sessionStorage — bukan localStorage (tidak persist antar tab/refresh)
      sessionStorage.setItem('playerId', hostId)
      sessionStorage.setItem('playerName', createForm.hostName)
      sessionStorage.setItem('isHost', 'true')
      sessionStorage.setItem('sessionToken', sessionToken)
      sessionStorage.setItem('roomCode', data.code)
      // JANGAN set page_loaded di sini — biar di room page yang set setelah verify

      router.push(`/room/${data.code}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const playerId = generateId()
      const sessionToken = generateSessionToken()
      const code = joinForm.code.toUpperCase().trim()
      const res = await fetch('/api/room/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          playerName: joinForm.playerName,
          playerId,
          sessionToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      sessionStorage.setItem('playerId', playerId)
      sessionStorage.setItem('playerName', joinForm.playerName)
      sessionStorage.setItem('isHost', 'false')
      sessionStorage.setItem('sessionToken', sessionToken)
      sessionStorage.setItem('roomCode', code)

      router.push(`/room/${code}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(to bottom, #07000f 0%, #120020 40%, #070010 100%)' }}>

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(60)].map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: Math.random() > 0.85 ? 2 : 1,
              height: Math.random() > 0.85 ? 2 : 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: '#f5e6c8',
              opacity: Math.random() * 0.7 + 0.2,
              animation: `pulse ${2 + Math.random() * 4}s infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }} />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="moon mx-auto mb-6" />
          <h1 className="text-5xl font-black mb-2 text-glow"
            style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
            WEREWOLF
          </h1>
          <p style={{ color: '#9e8a6c', fontFamily: 'Crimson Text, serif', fontStyle: 'italic', fontSize: '1.1rem' }}>
            The night holds secrets. Can you survive?
          </p>
        </div>

        {/* HOME */}
        {tab === 'home' && (
          <div className="space-y-3 animate-fade-in">
            <button onClick={() => setTab('create')} className="w-full py-4 rounded-xl btn-primary text-lg"
              style={{ borderRadius: '12px' }}>
              🏠 Buat Room Baru
            </button>
            <button onClick={() => setTab('join')} className="w-full py-4 rounded-xl btn-secondary text-lg"
              style={{ borderRadius: '12px' }}>
              🔑 Gabung Room
            </button>

            <div className="mt-8 space-y-2 text-center text-sm" style={{ color: '#6b5d47' }}>
              <p>⚡ Real-time multiplayer</p>
              <p>🎭 Role ditampilkan langsung di web</p>
              <p>🎩 Host jadi Moderator, tidak dapat role</p>
              <p>🔒 Anti-refresh untuk fairplay</p>
            </div>
          </div>
        )}

        {/* CREATE ROOM */}
        {tab === 'create' && (
          <div className="animate-slide-up p-6 rounded-2xl"
            style={{ background: 'rgba(18,0,32,0.88)', border: '1px solid rgba(245,230,200,0.12)', borderRadius: '18px' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif' }}>
              Buat Room Baru
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: '#9e8a6c' }}>Nama Room</label>
                <input
                  className="input-dark w-full rounded-xl px-4 py-3"
                  style={{ background: 'rgba(7,0,15,0.7)', border: '1px solid rgba(245,230,200,0.15)', color: '#f5e6c8', borderRadius: '10px' }}
                  placeholder="Contoh: Malam Mencekam"
                  required
                  value={createForm.roomName}
                  onChange={e => setCreateForm({ ...createForm, roomName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#9e8a6c' }}>
                  Nama Kamu <span style={{ color: '#6b5d47' }}>(sebagai Moderator/Host)</span>
                </label>
                <input
                  className="input-dark w-full rounded-xl px-4 py-3"
                  style={{ background: 'rgba(7,0,15,0.7)', border: '1px solid rgba(245,230,200,0.15)', color: '#f5e6c8', borderRadius: '10px' }}
                  placeholder="Nama Host"
                  required
                  value={createForm.hostName}
                  onChange={e => setCreateForm({ ...createForm, hostName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#9e8a6c' }}>
                  Jumlah Pemain (termasuk host): <span style={{ color: '#f5e6c8', fontWeight: 'bold' }}>{createForm.maxPlayers}</span>
                </label>
                <input type="range" min="5" max="30" className="w-full accent-red-700"
                  value={createForm.maxPlayers}
                  onChange={e => setCreateForm({ ...createForm, maxPlayers: parseInt(e.target.value) })}
                />
                <div className="flex justify-between text-xs" style={{ color: '#4a3d2e' }}>
                  <span>5</span><span>30</span>
                </div>
                <p className="text-xs mt-1" style={{ color: '#6b5d47' }}>
                  Host tidak dapat role — {createForm.maxPlayers - 1} pemain yang bermain
                </p>
              </div>

              {error && <p className="text-sm" style={{ color: '#e74c3c' }}>{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setTab('home'); setError('') }}
                  className="flex-1 py-3 rounded-xl btn-secondary" style={{ borderRadius: '10px' }}>
                  ← Kembali
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl btn-primary" style={{ borderRadius: '10px' }}>
                  {loading ? '⏳ Membuat...' : '🏠 Buat Room'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* JOIN ROOM */}
        {tab === 'join' && (
          <div className="animate-slide-up p-6 rounded-2xl"
            style={{ background: 'rgba(18,0,32,0.88)', border: '1px solid rgba(245,230,200,0.12)', borderRadius: '18px' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#f5e6c8', fontFamily: 'Cinzel, serif' }}>
              Gabung Room
            </h2>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: '#9e8a6c' }}>Kode Room</label>
                <input
                  className="input-dark w-full rounded-xl px-4 py-3 text-center tracking-widest"
                  style={{
                    background: 'rgba(7,0,15,0.7)', border: '1px solid rgba(245,230,200,0.15)',
                    color: '#f5e6c8', borderRadius: '10px', letterSpacing: '0.2em',
                    fontFamily: 'Cinzel, serif', fontSize: '1.1rem',
                  }}
                  placeholder="WOLF-XXXX"
                  required
                  maxLength={9}
                  value={joinForm.code}
                  onChange={e => setJoinForm({ ...joinForm, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="block text-sm mb-1" style={{ color: '#9e8a6c' }}>Nama Kamu</label>
                <input
                  className="input-dark w-full rounded-xl px-4 py-3"
                  style={{ background: 'rgba(7,0,15,0.7)', border: '1px solid rgba(245,230,200,0.15)', color: '#f5e6c8', borderRadius: '10px' }}
                  placeholder="Nama Pemain"
                  required
                  value={joinForm.playerName}
                  onChange={e => setJoinForm({ ...joinForm, playerName: e.target.value })}
                />
              </div>

              <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', color: '#e88' }}>
                ⚠️ Setelah masuk room, <strong>jangan refresh halaman</strong>. Kamu akan kehilangan akses dan tidak bisa masuk lagi.
              </div>

              {error && <p className="text-sm" style={{ color: '#e74c3c' }}>{error}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setTab('home'); setError('') }}
                  className="flex-1 py-3 rounded-xl btn-secondary" style={{ borderRadius: '10px' }}>
                  ← Kembali
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl btn-primary" style={{ borderRadius: '10px' }}>
                  {loading ? '⏳ Bergabung...' : '🔑 Gabung'}
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="text-center mt-8 text-xs" style={{ color: '#3a2d1e' }}>
          Werewolf Online · Made with Next.js
        </p>
      </div>
    </div>
  )
}
