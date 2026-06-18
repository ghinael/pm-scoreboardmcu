# PM Scoreboard — MCU

Dashboard performa PM (Overview, Papan Performa, Kaldik). Data ditarik live dari Google Sheets via publish-to-web CSV.

## Cara pakai (sekali setup, lalu lifetime)

### 1. Isi CSV_URL

Buka `src/App.jsx`, baris ke-10:

```js
const CSV_URL = ""; // <-- paste URL publish-to-web CSV di sini
```

Cara dapat URL-nya:
1. Buka Google Sheets **Scoreboard PM** → tab **`90_EXPORT_DASHBOARD`**
2. File → Share → **Publish to web**
3. Dropdown pertama pilih sheet **`90_EXPORT_DASHBOARD`** (bukan "Entire Document")
4. Dropdown kedua pilih **Comma-separated values (.csv)**
5. Klik **Publish** → copy link yang muncul → paste ke `CSV_URL`

### 2. Push ke GitHub

```bash
git init
git add .
git commit -m "PM Scoreboard dashboard"
git remote add origin <URL_REPO_GITHUB_KAMU>
git push -u origin main
```

Kalau belum punya repo, bikin dulu di github.com/new (boleh private atau public).

### 3. Deploy ke Vercel

1. Buka vercel.com → New Project
2. Import repo GitHub yang baru di-push
3. Framework Preset: **Vite** (otomatis terdeteksi)
4. Klik **Deploy**
5. Tunggu ±1 menit → dapat link permanen, contoh: `pm-scoreboard-mcu.vercel.app`

Link ini bisa dibuka siapa saja (Pak Aldi, komisaris, dst) tanpa perlu login atau buka Claude.

## Update data

Karena data ditarik live dari Google Sheets (publish-to-web), **tidak perlu deploy ulang** setiap data berubah. Cukup edit Spreadsheet seperti biasa — dashboard otomatis ambil data terbaru saat halaman di-refresh (delay beberapa menit setelah edit, normal untuk publish-to-web).

## Update tampilan / fitur

Kalau ingin ubah desain, tambah tab, atau ubah logika: edit `src/App.jsx`, lalu:

```bash
git add .
git commit -m "update dashboard"
git push
```

Vercel otomatis re-deploy setiap ada push baru ke branch utama — link tidak berubah.

## Development lokal (opsional, untuk preview sebelum push)

```bash
npm install
npm run dev
```

Buka `http://localhost:5173` di browser.
