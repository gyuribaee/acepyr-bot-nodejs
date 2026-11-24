# Acepyr Prediction Market Bot

Bot untuk **meletakkan taruhan (bet)** di pasar prediksi Acepyr.

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
git clone https://github.com/gyuribaee/acepyr-bot-nodejs.git
cd acepyr-bot-nodejs

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
PASSWORD=Anda_berharap_123
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
