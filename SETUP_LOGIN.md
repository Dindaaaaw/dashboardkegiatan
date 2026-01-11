# Cara Setup dan Menjalankan Sistem Login

## 1. Install Dependencies
Jalankan command ini untuk install express-session:
```bash
npm install
```

## 2. Cek File .env
Pastikan file `.env` sudah ada dan berisi:
```
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
```

Anda bisa mengubah username dan password sesuai keinginan.

## 3. Jalankan Server
```bash
npm run dev
```

## 4. Akses Aplikasi
1. Buka browser ke: http://localhost:3000
2. Anda akan otomatis diarahkan ke halaman login
3. Gunakan kredensial dari .env untuk login
4. Setelah login berhasil, Anda akan masuk ke dashboard

## Struktur File Baru
```
.
├── login.html          # Halaman login
├── dashboard.html      # Dashboard (sekarang butuh login)
├── server.js           # Server dengan autentikasi
├── .env                # Kredensial login disimpan di sini
└── package.json        # Ditambah dependency express-session
```

## Fitur Login
- ✅ Halaman login dengan form username/password
- ✅ Session-based authentication (bertahan 24 jam)
- ✅ Proteksi dashboard - hanya bisa diakses setelah login
- ✅ Tombol logout di dashboard
- ✅ Auto-redirect ke login jika belum login
- ✅ Auto-redirect ke dashboard jika sudah login

## Kredensial Default
**Username:** admin  
**Password:** admin123

**Cara mengubah kredensial:**
Edit file `.env`:
```
ADMIN_USERNAME="username_baru"
ADMIN_PASSWORD="password_baru"
```

## Catatan Penting
- Username dan password disimpan di `.env` (JANGAN commit file ini ke git!)
- Session bertahan 24 jam, setelah itu harus login ulang
- Halaman `/absen` (form input) TIDAK memerlukan login
- Hanya dashboard yang dilindungi login

## Deploy ke Vercel
Jangan lupa tambahkan environment variables di Vercel Dashboard:
1. Buka Settings → Environment Variables
2. Tambahkan:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET` (optional, untuk keamanan ekstra)

## Troubleshooting

**Problem: "Cannot find module 'express-session'"**
Solution: Jalankan `npm install`

**Problem: Login terus redirect ke halaman login**
Solution: 
- Pastikan `.env` file ada dan berisi ADMIN_USERNAME dan ADMIN_PASSWORD
- Restart server dengan `npm run dev`

**Problem: Lupa password**
Solution: Ubah di file `.env` lalu restart server
