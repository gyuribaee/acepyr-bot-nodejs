#!/usr/bin/env node
/**
 * Acepyr Prediction Market Bot (Node.js)
 *
 * Bot untuk meletakkan taruhan (bet) di pasar prediksi Acepyr.
 * - Login otomatis dengan email + password
 * - Navigasi ke Featured market
 * - Cari pasar QQQ (6 jam, threshold $642.79)
 * - Pilih Up / Down
 * - Masukkan jumlah taruhan
 * - Klik konfirmasi & tunggu hasil
 *
 * Deps: playwright (browser automation), dotenv
 *
 * Setup:
 *   1. cd /home/ubuntu/.hermes/cache/documents/native-inputs/1fdfe49a5caf1ec4393f0d4355b26e582491e00c4599810e24bb49fe92a225af
 *   2. npm install
 *   3. cp .env.example .env (isi EMAIL, PASSWORD, MARKET, AMOUNT, SIDE)
 *   4. npx playwright install chromium
 *   5. node acepyr-bot.js
 *
 * Catatan: situs menggunakan Cloudflare bot protection.
 * Bot ini mencoba lewat playwright, akan ada tantangan captcha.
 * Kamu bisa mengisi captcha manual kalau muncul.
 */

import 'dotenv/config';
import { chromium, firefox, webkit } from 'playwright';
import { readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Konfigurasi dari .env ───────────────────────────────────────────────
const CONFIG = {
  email: process.env.EMAIL || '',
  password: process.env.PASSWORD || '',
  market: process.env.MARKET || 'QQQ',            // Nama pasar (contoh: QQQ, DJI, etc.)
  side: process.env.SIDE || 'Down',               // "Up" atau "Down"
  amount: process.env.AMOUNT || '0.25',           // Jumlah taruhan
  url: process.env.URL || 'https://acepyr.com/home',
  headless: process.env.HEADLESS !== 'false',
  browser: process.env.BROWSER || 'chromium',
  timeout: parseInt(process.env.TIMEOUT || '60000', 10),
  retry: parseInt(process.env.RETRY || '3', 10),
};

// ── Logging ───────────────────────────────────────────────────────────────
const C = {
  RESET: '\x1b[0m', BOLD: '\x1b[1m', DIM: '\x1b[2m',
  RED: '\x1b[91m', GRN: '\x1b[92m', YLW: '\x1b[93m',
  BLU: '\x1b[94m', CYN: '\x1b[96m', GRY: '\x1b[90m',
};
const LEVEL_COLOR = { ERROR: C.RED, WARN: C.YLW, OK: C.GRN, INFO: C.CYN };

function log(msg, level = 'INFO') {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `${C.GRY}[${ts}]${C.RESET} ${LEVEL_COLOR[level] || C.CYN}${level.padEnd(5)}${C.RESET} ${msg}`;
  console.log(line);
  try {
    const dir = resolve(dirname(fileURLToPath(import.meta.url)), 'data');
    mkdirSync(dir, { recursive: true });
    const clean = msg.replace(/\x1b\[[0-9;]*m/g, '');
    appendFileSync(resolve(dir, 'bot.log'), `[${ts}] [${level}] ${clean}\n`);
  } catch { /* ignore */ }
}

async function sleep(ms) { await new Promise(r => setTimeout(r, ms)); }

// ── Banner ────────────────────────────────────────────────────────────────
function banner() {
  console.log(`${C.YLW}${C.BOLD}`);
  console.log('    ██╗  ██╗   ██╗   ███████╗');
  console.log('    ██║ ██╔╝   ██║   ╚════██║');
  console.log('    █████╔╝    ██║       ██║');
  console.log('    ██╔═██╗    ██║       ██║');
  console.log('    ██║  ██╗   ██║   ██╗ ██║');
  console.log('    ╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═╝');
  console.log(`${C.RESET}${C.BOLD}  ACEPYR PREDICTION MARKET BOT${C.RESET} ${C.GRY}· simpan login manual kalau captcha${C.RESET}`);
  console.log(`${C.GRY}  market: ${CONFIG.market.padEnd(8)} · side: ${CONFIG.side.padEnd(6)} · amount: ${CONFIG.amount}${C.RESET}`);
  console.log(`${C.GRY}  ${'─'.repeat(52)}${C.RESET}`);
}

// ── 1. Setup browser ──────────────────────────────────────────────────────
async function createBrowser() {
  const factories = { chromium, firefox, webkit };
  const factory = factories[CONFIG.browser] || chromium;
  log(`Browser: ${CONFIG.browser} (headless=${CONFIG.headless})`, 'INFO');
  const browser = await factory.launch({
    headless: CONFIG.headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  return browser;
}

// ── 2. Login ──────────────────────────────────────────────────────────────
async function loginPage(page) {
  const url = CONFIG.url;
  log(`Navigasi ke ${url}`, 'INFO');
  await page.goto(url, { timeout: CONFIG.timeout, waitUntil: 'domcontentloaded' });

  log('Menunggu identifikasi (Cloudflare...)', 'INFO');
  await page.waitForTimeout(5000);

  // Cek apakah sudah di halaman utama (bukan challenge)
  const isDashboard = await page.$('text=Featured').catch(() => null);
  if (isDashboard) {
    log('Sudah di halaman Main (bukan login)', 'INFO');
    return;
  }

  // Coba cari form login
  let emailInput = null;
  for (const sel of ['input[type="email"]', 'input[type="text"]', 'input[name="email"]', 'input[id="email"]', 'input[placeholder*="email"]']) {
    emailInput = await page.$(sel).catch(() => null);
    if (emailInput) break;
  }

  if (emailInput) {
    await emailInput.clear();
    await emailInput.fill(CONFIG.email);
    log(`Isi email: ${CONFIG.email}`, 'OK');
  } else {
    log('Tidak ketemu input email, pastikan di halaman login', 'WARN');
    return;
  }

  // Coba cari input password
  let passInput = null;
  for (const sel of ['input[type="password"]', 'input[name="password"]', 'input[id="password"]', 'input[placeholder*="password"]']) {
    passInput = await page.$(sel).catch(() => null);
    if (passInput) break;
  }

  if (passInput) {
    await passInput.fill(CONFIG.password);
    log('Isi password', 'OK');
  }

  // Coba cari tombol submit/login
  let submitBtn = null;
  for (const sel of [
    'button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Masuk")',
    'button:has-text("Sign in")', 'button:has-text("OK"), button:has-text("Berikutnya")',
  ]) {
    submitBtn = await page.$(sel).catch(() => null);
    if (submitBtn) break;
  }

  if (submitBtn) {
    await submitBtn.click();
    log('Klik tombol Login', 'INFO');
  } else {
    log('Gak ada tombol login yang ketemu, cek manually', 'WARN');
  }

  await page.waitForTimeout(3000);

  // Cek hasil
  const title = await page.title().catch(() => '');
  log(`Halaman setelah login: ${title}`, 'INFO');

  const inFeatured = await page.$('text=Featured').catch(() => null);
  if (inFeatured) {
    log('Sudah di halaman Featured ✓', 'OK');
  } else {
    log('Belum di Featured, cek manually di browser', 'WARN');
  }
}

// ── 3. Navigasi ke Featured ────────────────────────────────────────────────
async function goToFeatured(page) {
  log('Mencari tab Featured...', 'INFO');
  await page.waitForTimeout(2000);
  try {
    const featured = await page.waitForSelector('text=Featured', { timeout: 10000, state: 'visible' }).catch(() => null);
    if (featured) {
      await featured.click();
      log('Klik Featured ✓', 'OK');
    }
  } catch { /* mungkin sudah aktif */ }
  await page.waitForTimeout(1500);
}

// ── 4. Cari pasar QQQ ─────────────────────────────────────────────────────
async function findMarket(page, marketName) {
  log(`Mencari pasar ${marketName}...`, 'INFO');
  await page.waitForTimeout(1500);

  // Coba cari input search
  let searchInput = null;
  for (const sel of ['input[type="text"]', 'input[name="search"]', 'input[placeholder*="search"]', 'input[placeholder*="pasar"]', 'input[placeholder*="Market"]']) {
    searchInput = await page.$(sel).catch(() => null);
    if (searchInput) break;
  }

  if (searchInput) {
    await searchInput.click();
    await searchInput.fill(marketName);
    log(`Cari: ${marketName}`, 'INFO');
    await page.waitForTimeout(1000);
  }

  // Cek hasil search
  let result = null;
  try {
    result = await page.waitForSelector('text=' + marketName, { timeout: 8000, state: 'visible' }).catch(() => null);
  } catch { /* ignore */ }

  if (result) {
    log(`Ditemukan pasar ${marketName} ✓`, 'OK');
    return true;
  }

  log('Masih mencari... cek list market', 'INFO');
  await page.waitForTimeout(1000);
  return false;
}

// ── 5. Pilih sisi Up / Down ──────────────────────────────────────────────
async function selectSide(page, side) {
  log(`Pilih sisi ${side}...`, 'INFO');
  await page.waitForTimeout(1500);

  let option = null;
  for (const s of [side, side.toLowerCase()]) {
    for (const sel of [`text=${s}`, `button:has-text("${s}")`, `div:has-text("${s}")`]) {
      option = await page.$(sel).catch(() => null);
      if (option) break;
    }
    if (option) break;
  }

  if (option) {
    await option.click();
    log(`Pilih ${side} ✓`, 'OK');
    await page.waitForTimeout(1500);
    return true;
  }

  // Coba cari elemen dengan teks "Up" / "Down" (bisa dalam div/box)
  for (const s of [side, side.toLowerCase()]) {
    for (const sel of [`text= ${s}`, `text=${s} `, `div:has-text("${s}")`, `button:has-text("${s}")`]) {
      option = await page.$(sel).catch(() => null);
      if (option) {
        await option.click();
        log(`Pilih ${side} (via selector) ✓`, 'OK');
        await page.waitForTimeout(1500);
        return true;
      }
    }
  }

  log('Tidak ketemu label, coba pilih manual: tekan tombol "Up" atau "Down" (pojok kanan atas/atas pasar)', 'WARN');
  return false;
}

// ── 6. Masukkan jumlah taruhan ────────────────────────────────────────────
async function enterAmount(page, amount) {
  log(`Masukkan jumlah taruhan ${amount}...`, 'INFO');
  await page.waitForTimeout(1500);

  let amountInput = null;
  for (const sel of [
    'input[type="number"]', 'input[type="text"][step="0.01"]',
    'input[placeholder*="taruh"]', 'input[placeholder*="stake"]',
    'input[placeholder*="bet"]', 'input[placeholder*="jumlah"]',
    'input[id="amount"]', 'input[name="amount"]',
    'input[aria-label*="taruh"]', 'input[aria-label*="stake"]',
    'input[aria-label*="jumlah"]',
  ]) {
    amountInput = await page.$(sel).catch(() => null);
    if (amountInput) break;
  }

  if (amountInput) {
    await amountInput.click();
    await amountInput.fill(amount.toString());
    log(`Isi jumlah: ${amount}`, 'OK');
  } else {
    log('Tidak ketemu input jumlah, coba manual', 'WARN');
  }

  await page.waitForTimeout(1500);
}

// ── 7. Klik tombol konfirmasi ─────────────────────────────────────────────
async function confirmBet(page) {
  log('Mencari tombol konfirmasi...', 'INFO');
  await page.waitForTimeout(1500);

  let confirmBtn = null;
  for (const sel of [
    'button:has-text("Konfirmasi")', 'button:has-text("Bet")',
    'button:has-text("Pilih")', 'button:has-text("Place")',
    'button:has-text("OK")', 'button:has-text("Mulai")',
    'button:has-text("Ya")', 'button:has-text("Setujui")',
  ]) {
    confirmBtn = await page.$(sel).catch(() => null);
    if (confirmBtn) break;
  }

  if (confirmBtn) {
    const txt = await confirmBtn.textContent().catch(() => 'klik');
    log(`Klik tombol: ${txt}`, 'INFO');
    await confirmBtn.click();
    log('Klik konfirmasi ✓', 'INFO');
  } else {
    log('Gak ketemu tombol konfirmasi, kemungkinan sudah klik otomatis atau perlu manual', 'WARN');
  }

  await page.waitForTimeout(3000);
}

// ── 8. Cek hasil ──────────────────────────────────────────────────────────
async function checkResult(page) {
  log('Cek hasil taruhan...', 'INFO');
  await page.waitForTimeout(3000);

  let balance = null;
  try {
    const bodyText = await page.textContent('body').catch(() => '');
    const m = bodyText.match(/[0-9]+\.[0-9]{2,3}/);
    if (m) balance = m[0];
    log(`Saldo: ${balance}`, 'INFO');
  } catch { /* ignore */ }

  const success = await page.$('text=SUCCESS', { timeout: 3000 }).catch(() => null);
  const fail = await page.$('text=GAGAL', { timeout: 3000 }).catch(() => null);

  if (success) log('Hasil: ✅ SUKSES', 'OK');
  else if (fail) log('Hasil: ❌ GAGAL', 'ERROR');
  else log('Hasil: tunggu... (cari teks berwarna di halaman)', 'INFO');
}

// ── 9. Main flow ──────────────────────────────────────────────────────────
async function main() {
  banner();

  if (!CONFIG.email || !CONFIG.password) {
    log('INFO: Isi EMAIL & PASSWORD di .env (contoh: EMAIL=fajrulirfan12345@gmail.com PASSWORD=...)', 'WARN');
    log('INFO: Atau jalankan: cp .env.example .env lalu isi', 'WARN');
  }

  for (let attempt = 1; attempt <= CONFIG.retry; attempt++) {
    log(`\n===== Mencoba (attempt ${attempt}/${CONFIG.retry}) =====`, 'INFO');

    let browser;
    try {
      browser = await createBrowser();
      const page = await browser.newPage();

      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      });
      await page.setViewport({ width: 1280, height: 720 });

      // Buka halaman & login
      await loginPage(page);

      // Navigasi ke Featured
      await goToFeatured(page);

      // Cari pasar
      const found = await findMarket(page, CONFIG.market);
      if (!found) {
        log('Pasar tidak ketemu, lihat manual di browser', 'WARN');
        await page.waitForTimeout(5000);
      }

      // Pilih sisi
      const selected = await selectSide(page, CONFIG.side);
      if (!selected) {
        log('Pilih manual dulu (tombol Up/Down), lanjut ke amount', 'INFO');
      }

      // Masukkan jumlah
      await enterAmount(page, CONFIG.amount);

      // Klik konfirmasi
      await confirmBet(page);

      // Cek hasil
      await checkResult(page);

      await page.waitForTimeout(3000);
      await browser.close();
      return; // Sukses

    } catch (e) {
      log(`Attempt ${attempt} gagal: ${e.message}`, 'ERROR');
      if (browser) await browser.close();
      if (attempt < CONFIG.retry) {
        log('Retry dalam 5 detik...', 'INFO');
        await sleep(5000);
      }
    }
  }

  log('Semua attempt gagal. Bot berhenti.', 'ERROR');
  process.exit(1);
}

// ── Run ───────────────────────────────────────────────────────────────────
main().catch(e => {
  log(`FATAL: ${e.message}`, 'ERROR');
  process.exit(1);
}).finally(() => {
  log('Semua selesai. Buka acepyr.com/home untuk cek manual.', 'INFO');
});
