# HOT Wallet Auto Claim Bot (Node.js)

Node.js port dari `bot.py` — bot otomatis claim harian $HOT untuk akun NEAR di game **game.hot.tg**.

## Fitur

- Claim otomatis saat storage full (bukan delay fix)
- Rotasi RPC server kalau kena rate limit (429)
- Anti-bot: jitter 5–90 menit setelah storage full, sebaran awal akun
- Auto-resolve `account_id` dari private key (via nearblocks)
- Charge gas fee otomatis kalau NEAR < 0.09 (bayar pakai HOT)
- JWT auth ke backend API0.herewallet.app
- Multi-akun, state disimpan di `data/state.json`
- Logging ANSI + flat file log di `data/bot.log`

## Struktur proyek

```
.
├── index.js           # entry point (main loop)
├── package.json       # deps & scripts
├── README.md          # ini
├── .gitignore         # jangan upload data/ & node_modules/
├── accounts.example.json   # contoh accounts.json (ganti private key)
└── data/              # di-generate otomatis (bukan repo)
    ├── accounts.json
    ├── state.json
    └── bot.log
```

## Setup

1. **Clone & install deps**
   ```bash
   npm install
   ```

2. **Siapkan akun**
   ```bash
   cp accounts.example.json data/accounts.json
   ```
   Isi `data/accounts.json` dengan daftar akun:
   ```json
   {
     "accounts": [
       {
         "account_id": "your.near.account",
         "private_key": "ed25519:XXXX..."
       }
     ]
   }
   ```
   - `account_id` bersifat opsional — kalau kosong, bot akan otomatis resolve dari private key via nearblocks API.
   - **Jangan** kirim `accounts.json` atau private key ke mana pun. File ini hanya di-simpan lokal.

3. **Jalankan**
   ```bash
   npm start
   ```

## Cara kerja

1. Baca `data/accounts.json` → cek `account_id`, kalau kosong resolve dari PK.
2. Hitung kapan storage full masing-masing akun (berdasarkan `storage_level` dari `get_user` view).
3. Setiap akun tunggu sampai storage full + jitter 5–90 menit, lalu claim.
4. Saat claim:
   - Ambil `game_state` dari `game.hot.tg` via RPC `view`
   - Request signature ke backend API0.herewallet.app
   - Daftarin public key ke `intents.near` (1x per akun)
   - Auth ke backend → dapat JWT
   - Kirim transaksi `l2_claim` via RPC `broadcast_tx_commit`
5. Simpan state (next claim time, balance, etc.) ke `data/state.json`.
6. Ulangi setiap 60 detik.

## Catatan penting

- **Private key**: disimpan di `data/accounts.json`. Jangan commit atau bagikan file ini.
- **RPC rate limit**: bot menyediakan 4 RPC endpoint dan berputar kalau ada yg kena 429.
- **NEAR balance < 0.09**: kalau saldo HOT cukup (>= 0.02 HOT), bot otomatis setel `charge_gas_fee = true` untuk bayar gas pakai HOT.
- **Storage full**: bot cek terlebih dahulu apakah storage sudah benar-benar full sebelum claim (anti-wasted claim).
- **Node version**: minimal Node.js 18 (pakai built-in `fetch`).

## License

MIT

---

# Acepyr Prediction Market Bot

Bot untuk **meletakkan taruhan (bet)** di pasar prediksi Acepyr (masyarakat QQQ).

## Fitur

- Login otomatis dengan email + password
- Navigasi ke tab **Featured**
- Cari pasar (QQQ, DJI, dll)
- Pilih sisi **Up** / **Down**
- Masukkan jumlah taruhan
- Klik konfirmasi
- Cek hasil di terminal
- Logging ke `data/bot.log`

## Setup di Termux (Android)

```bash
# 1. Clone repo
git clone https://github.com/gyuribaee/hot-wallet-auto-claim-bot.git
cd hot-wallet-auto-claim-bot

# 2. Install Node.js & npm (kalau belum ada di Termux)
pkg install nodejs npm

# 3. Install deps
npm install

# 4. Install Playwright browser
npx playwright install chromium

# 5. Siapkan konfigurasi
cp .env.example .env
# Edit .env: isi EMAIL, PASSWORD, MARKET, SIDE, AMOUNT

# 6. Jalankan
node acepyr-bot.js
```

## Konfigurasi (.env)

```env
EMAIL=fajrulirfan12345@gmail.com
PASSWORD=Andai_ketemu_123
MARKET=QQQ
SIDE=Down
AMOUNT=0.25
URL=https://acepyr.com/home
HEADLESS=false
BROWSER=chromium
TIMEOUT=60000
RETRY=3
```

### Keterangan

| Variabel | Default | Keterangan |
|---|---|---|
| `EMAIL` | - | Email akun Acepyr |
| `PASSWORD` | - | Password akun Acepyr |
| `MARKET` | `QQQ` | Nama pasar (bisa diganti) |
| `SIDE` | `Down` | `Up` atau `Down` |
| `AMOUNT` | `0.25` | Jumlah taruhan |
| `URL` | `https://acepyr.com/home` | URL halaman utama |
| `HEADLESS` | `false` | `false` = tampilkan browser, `true` = sabar |
| `BROWSER` | `chromium` | `chromium` \| `firefox` \| `webkit` |
| `TIMEOUT` | `60000` | Timeout (ms) |
| `RETRY` | `3` | Jumlah percobaan |

## Catatan

- Situs menggunakan **Cloudflare bot protection**. Bot akan berusaha lewat Playwright, tapi bisa ketahuan akan captcha.
- Kalau muncul captcha → **kamu isi manual** di browser, lalu tutup browser.
- Jangan share file `.env` (bawa password). File ini di-ignore oleh `.gitignore`.
- Versi `HEADLESS=false` untuk debugging, `true` untuk otomatis.
- Jangan gunakan akun dengan saldo kecil untuk taruhan besar.

## License

MIT

