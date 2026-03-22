# 🐺 Werewolf Game — Real-time Multiplayer

Game Werewolf online dengan real-time multiplayer, kirim role via WhatsApp, siap deploy ke Vercel.

## 🛠️ Tech Stack

| Kebutuhan | Teknologi | Harga |
|-----------|-----------|-------|
| Framework | Next.js 14 | Gratis |
| Realtime | Pusher | Gratis (200k msg/hari) |
| Database sementara | Upstash Redis | Gratis (10k req/hari) |
| WhatsApp API | Fonnte | ~Rp 150-300/pesan |
| Deploy | Vercel | Gratis |

---

## 🚀 Setup Step-by-Step

### STEP 1 — Daftar & Siapkan Akun

#### A. Pusher (Realtime)
1. Buka https://pusher.com → Sign Up (gratis)
2. Buka Dashboard → **Create App**
3. Isi nama app (contoh: `werewolf-game`)
4. Pilih cluster: **ap1 (Asia Pacific - Singapore)**
5. Klik **App Keys** — catat:
   - `app_id`
   - `key`
   - `secret`
   - `cluster` (ap1)

#### B. Upstash Redis (Database sementara)
1. Buka https://upstash.com → Sign Up (gratis, pakai Google)
2. Klik **Create Database**
3. Isi nama, pilih region: **ap-southeast-1 (Singapore)**
4. Klik database yang dibuat → tab **REST API**
5. Catat:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

#### C. Fonnte (WhatsApp API)
1. Buka https://fonnte.com → Daftar
2. Hubungkan nomor WhatsApp kamu (scan QR)
3. Buka **Token** di dashboard
4. Catat token-mu

---

### STEP 2 — Setup Project Lokal

```bash
# Clone / download project ini
git clone <repo-url>
cd werewolf-game

# Install dependencies
npm install

# Salin env example
cp .env.local.example .env.local
```

Edit file `.env.local`:
```env
NEXT_PUBLIC_PUSHER_KEY=xxxx          # dari Pusher App Keys → key
NEXT_PUBLIC_PUSHER_CLUSTER=ap1       # cluster kamu
PUSHER_APP_ID=xxxx                   # dari Pusher App Keys → app_id  
PUSHER_SECRET=xxxx                   # dari Pusher App Keys → secret

UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxx

FONNTE_TOKEN=xxxx                    # dari dashboard Fonnte

GAME_SESSION_TTL=7200                # 2 jam (bisa diubah)
```

```bash
# Jalankan lokal
npm run dev
# Buka http://localhost:3000
```

---

### STEP 3 — Push ke GitHub

```bash
git init
git add .
git commit -m "Initial commit - Werewolf Game"
git branch -M main
git remote add origin https://github.com/USERNAME/werewolf-game.git
git push -u origin main
```

---

### STEP 4 — Deploy ke Vercel

1. Buka https://vercel.com → Login dengan GitHub
2. Klik **Add New → Project**
3. Import repo `werewolf-game`
4. Sebelum deploy, klik **Environment Variables** dan isi semua variable dari `.env.local`:

```
NEXT_PUBLIC_PUSHER_KEY        = (isi dari Pusher)
NEXT_PUBLIC_PUSHER_CLUSTER    = ap1
PUSHER_APP_ID                 = (isi dari Pusher)
PUSHER_SECRET                 = (isi dari Pusher)
UPSTASH_REDIS_REST_URL        = (isi dari Upstash)
UPSTASH_REDIS_REST_TOKEN      = (isi dari Upstash)
FONNTE_TOKEN                  = (isi dari Fonnte)
GAME_SESSION_TTL              = 7200
```

5. Klik **Deploy** → tunggu ~2 menit
6. Selesai! Vercel memberi domain seperti `werewolf-game.vercel.app`

---

## 🎮 Cara Main

### Sebagai HOST:
1. Buka website → klik **Buat Room Baru**
2. Isi nama room, namamu, nomor WA (opsional), jumlah pemain
3. Klik **Buat Room** → kamu masuk lobby
4. Bagikan **kode WOLF-XXXX** ke teman-teman
5. Tunggu semua join → atur role (Auto atau Custom)
6. Klik **Mulai Game!**
7. Role dikirim otomatis ke WA masing-masing pemain
8. Klik **Akhiri Malam** setelah semua aksi malam selesai
9. Di siang hari, semua voting → otomatis tereliminasi

### Sebagai PEMAIN:
1. Buka website → klik **Gabung Room**
2. Masukkan kode WOLF-XXXX dari host
3. Isi nama & nomor WA
4. Tunggu host mulai game
5. Cek WA untuk tahu role-mu
6. Mainkan sesuai role!

---

## 🎭 Penjelasan Role

| Role | Tim | Kemampuan |
|------|-----|-----------|
| 🐺 Werewolf | Jahat | Bunuh 1 warga tiap malam |
| 🔮 Seer | Baik | Lihat identitas 1 pemain tiap malam |
| 🛡️ Guard | Baik | Lindungi 1 pemain dari serangan |
| 🧙 Witcher | Baik | Punya racun & ramuan (1x pakai masing-masing) |
| 🍺 Drunk | Baik | Mabuk, peran random |
| 🌕 Lycan | Baik | Terlihat seperti Werewolf oleh Seer |
| 👨‍🌾 Villager | Baik | Tidak ada kemampuan khusus |

### Auto Scale (jumlah role berdasarkan pemain):
- 5 pemain: 1 WW, 1 Seer, 1 Guard, 2 Villager
- 7 pemain: 2 WW, 1 Seer, 1 Guard, 1 Witcher, 1 Lycan, 1 Villager
- 10 pemain: 3 WW, 2 Seer, 1 Guard, 1 Witcher, 1 Drunk, 1 Lycan, 1 Villager

---

## 🔒 Keamanan & Privacy

- ✅ Nomor WA **TIDAK** disimpan di database permanen
- ✅ Nomor WA tersimpan di Redis dengan TTL 2 jam (otomatis hapus)
- ✅ Setelah game selesai, semua data dihapus
- ✅ API key tidak pernah dikirim ke frontend

---

## 🐛 Troubleshooting

**WA tidak terkirim?**
- Pastikan Fonnte token sudah diisi
- Pastikan nomor WA di Fonnte masih online/terhubung
- Cek di Fonnte dashboard → Logs

**Realtime tidak update?**
- Pastikan Pusher key & cluster benar
- Cek Pusher dashboard → Event Log

**Redis error?**
- Pastikan Upstash URL dan token benar (copy paste, jangan ketik manual)
- Pastikan tidak ada spasi di awal/akhir token

**Deploy gagal di Vercel?**
- Pastikan semua env variable sudah diisi di Vercel dashboard
- Cek Vercel → Deployments → Function Logs

---

## 📁 Struktur Project

```
werewolf-game/
├── pages/
│   ├── index.js          # Halaman utama (buat/join room)
│   ├── room/[code].js    # Halaman game room
│   └── api/
│       ├── room/
│       │   ├── create.js    # Buat room baru
│       │   ├── join.js      # Gabung room
│       │   ├── status.js    # Status room & pemain
│       │   └── update-roles.js
│       ├── game/
│       │   ├── start.js     # Mulai game
│       │   ├── action.js    # Aksi malam
│       │   └── vote.js      # Voting siang
│       └── whatsapp/
│           └── send-role.js # Kirim ulang role
├── lib/
│   ├── redis.js          # Upstash Redis helper
│   ├── pusher.js         # Pusher realtime helper
│   ├── roles.js          # Logic role & auto-scale
│   └── whatsapp.js       # Fonnte WA API helper
├── styles/
│   └── globals.css       # Styling
├── .env.local.example    # Contoh env variables
├── vercel.json           # Konfigurasi Vercel
└── README.md             # Panduan ini
```
