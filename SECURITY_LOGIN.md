# Anti Brute Force & Captcha - Login Security

## Fitur yang Ditambahkan

### 1. Simple Captcha
- **Lokasi**: Halaman login (`login.html`)
- **Jenis**: Operasi matematika sederhana (penjumlahan, pengurangan, perkalian)
- **Fitur**:
  - Generate otomatis soal random
  - Tombol refresh untuk generate ulang soal
  - Validasi di client-side sebelum submit ke server
  - Auto refresh captcha setelah gagal login

### 2. Rate Limiting (Server-side)
- **Lokasi**: `server.js` pada route `/api/login`
- **Library**: `express-rate-limit`
- **Konfigurasi**:
  - **Window**: 15 menit
  - **Max attempts**: 10 requests per IP
  - **Response**: HTTP 429 (Too Many Requests)
  - **Message**: "Terlalu banyak percobaan login dari IP ini. Silakan coba lagi setelah 15 menit."

### 3. Client-side Lock Mechanism
- **Lokasi**: `login.html` (JavaScript)
- **Fitur**:
  - Tracking failed login attempts menggunakan `localStorage`
  - **Lock trigger**: Setelah 5 kali gagal login
  - **Lock duration**: 15 menit
  - **Display**: 
    - Countdown timer menunjukkan sisa waktu lock
    - Tombol login disabled saat locked
    - Alert warning dengan pesan jelas
  - Auto unlock setelah periode lock berakhir

### 4. User Feedback
- **Remaining attempts counter**: Menampilkan sisa percobaan (contoh: "3 percobaan tersisa")
- **Alert system**: 
  - Error alert untuk login gagal
  - Warning alert untuk account locked
  - Success alert untuk login berhasil
- **Visual indicators**: Loading state pada tombol login

## Cara Kerja

### Flow Login dengan Security:
1. User memasukkan username & password
2. User harus mengisi captcha (operasi matematika)
3. Sistem validasi captcha di client-side
4. Jika captcha benar, request dikirim ke server
5. Server check rate limiting berdasarkan IP
6. Jika belum exceed limit, validasi credentials
7. Jika gagal:
   - Counter failed attempts bertambah
   - Captcha di-refresh otomatis
   - Menampilkan sisa percobaan
   - Setelah 5 kali gagal → lock 15 menit
8. Jika berhasil:
   - Reset failed attempts counter
   - Redirect ke dashboard

### Multi-layer Protection:
- **Layer 1**: Captcha (mencegah automated bot)
- **Layer 2**: Client-side lock (mencegah spam dari browser yang sama)
- **Layer 3**: Server-side rate limiting (mencegah brute force dari IP yang sama)

## Testing

### Test Captcha:
1. Buka halaman login
2. Coba masukkan jawaban captcha yang salah
3. Verifikasi muncul error message
4. Coba klik tombol refresh captcha

### Test Client-side Lock:
1. Login dengan password salah 5 kali berturut-turut
2. Verifikasi akun terkunci dengan countdown timer
3. Verifikasi tombol login disabled
4. Tunggu atau refresh browser, lock masih aktif (tersimpan di localStorage)

### Test Rate Limiting:
1. Gunakan tool seperti Postman/curl
2. Kirim 10+ requests ke `/api/login` dalam waktu singkat
3. Verifikasi response HTTP 429 setelah request ke-10

## Dependencies Baru

```json
{
  "express-rate-limit": "^7.1.5"
}
```

## Installation

```bash
npm install
```

## Environment Variables

Tidak ada environment variable tambahan yang diperlukan. Rate limiter menggunakan konfigurasi default yang sudah di-set di code.

## Catatan Keamanan

1. **Rate limiting berbasis IP**: Jika user menggunakan VPN atau shared network, bisa kena rate limit bersama-sama
2. **Client-side lock menggunakan localStorage**: User bisa clear localStorage untuk bypass lock (tapi masih ada server-side rate limiting)
3. **Simple captcha**: Hanya mencegah bot sederhana, bukan CAPTCHA level enterprise
4. Untuk production, pertimbangkan:
   - Menggunakan reCAPTCHA atau hCaptcha
   - Rate limiting berbasis user account (bukan hanya IP)
   - Logging attempt ke database untuk monitoring
   - Two-factor authentication (2FA)

## Maintenance

- **Rate limiter reset**: Otomatis setiap 15 menit per IP
- **Client lock storage**: Tersimpan di `localStorage` dengan key `loginLock`
- **Clear locks**: User bisa clear localStorage browser untuk reset client-side lock

## Troubleshooting

### Issue: Rate limit terlalu ketat
**Solusi**: Edit nilai `max` di `loginLimiter` di `server.js` (default: 10)

### Issue: Lock duration terlalu lama
**Solusi**: Edit nilai `lockAccount(15)` di `login.html` (default: 15 menit)

### Issue: Captcha terlalu sulit
**Solusi**: Edit `generateCaptcha()` untuk gunakan hanya penjumlahan, atau range angka lebih kecil
