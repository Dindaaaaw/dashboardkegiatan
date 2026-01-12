# Fix untuk Deployment Vercel

## Masalah yang Ditemukan

### 1. Session Login Tidak Bekerja di Vercel ❌
**Penyebab**: Vercel menggunakan serverless function yang stateless. Session yang disimpan di memory akan hilang setiap request.

**Solusi**: 
- Install `connect-mongo` untuk menyimpan session di MongoDB
- Session sekarang persistent dan akan bertahan meskipun serverless function restart

### 2. Logo PNG Not Found ❌
**Penyebab**: 
- File logo bernama: `Logo.png` (huruf besar L)
- Di HTML menggunakan: `logo.png` (huruf kecil)
- Windows tidak case-sensitive, tapi Linux/Vercel case-sensitive

**Solusi**: Update semua referensi logo di HTML menjadi `Logo.png`

## Perubahan yang Dilakukan

### 1. Package.json
```json
{
  "dependencies": {
    "connect-mongo": "^5.1.0",  // ← TAMBAHAN BARU
    // ... dependencies lainnya
  }
}
```

### 2. Server.js
**Tambahan Import:**
```javascript
const MongoStore = require('connect-mongo');
```

**Update Session Configuration:**
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'dashboard-kegiatan-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({              // ← SESSION STORE
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60
    }),
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'  // ← PENTING UNTUK VERCEL
    }
}));
```

### 3. File HTML (login.html, dashboard.html, ddekk.html)
**Sebelum:**
```html
<img src="logo.png" alt="Logo">
```

**Sesudah:**
```html
<img src="Logo.png" alt="Logo">
```

## Cara Deploy ke Vercel

1. Install dependencies baru:
```bash
npm install
```

2. Commit semua perubahan:
```bash
git add .
git commit -m "Fix session login dan logo untuk Vercel"
git push
```

3. Pastikan environment variables di Vercel sudah lengkap:
   - `MONGODB_URI` - Connection string MongoDB
   - `BLOB_READ_WRITE_TOKEN` - Vercel Blob token
   - `ADMIN_USERNAME` - Username admin
   - `ADMIN_PASSWORD` - Password admin
   - `SESSION_SECRET` - Secret untuk session (opsional)
   - `NODE_ENV` - Set ke `production`

4. Vercel akan otomatis redeploy setelah push

## Testing

Setelah deploy, test:
1. ✅ Login berhasil dan session tetap aktif setelah refresh
2. ✅ Logo muncul di semua halaman (login, dashboard, input)
3. ✅ Logout berfungsi dengan baik

## Catatan Penting

- Session sekarang disimpan di collection `sessions` di MongoDB
- Session akan otomatis expire setelah 24 jam
- Logo file HARUS tetap bernama `Logo.png` dengan huruf besar L
