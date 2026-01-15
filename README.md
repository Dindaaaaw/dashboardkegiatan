# Dashboard Absensi

Aplikasi absensi sederhana menggunakan Node.js, Express, MongoDB Atlas, dan Vercel Blob.

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Storage**: Vercel Blob
- **Deployment**: Vercel Serverless

## Setup Storage di Vercel Dashboard

### 1. Buka Vercel Dashboard
1. Buka: https://vercel.com/dashboard
2. Pilih project Anda
3. Klik tab **Storage**

### 2. Create MongoDB Atlas (dari Vercel)
1. Klik **Create Store** → Pilih **Postgres** atau scroll ke bawah
2. Cari dan pilih **MongoDB Atlas** (Vercel akan redirect ke MongoDB)
3. Login/daftar MongoDB Atlas melalui Vercel integration
4. Vercel akan otomatis:
   - Membuat cluster MongoDB
   - Setup database user
   - Whitelist IP Vercel
   - Connect ke project Anda
5. Connection string akan otomatis tersimpan di environment variables
6. Copy **MONGODB_URI** dari tab Environment Variables

**Alternatif (Manual Setup):**
Jika MongoDB Atlas tidak muncul di Vercel Storage:
1. Daftar gratis di: https://www.mongodb.com/cloud/atlas/register
2. Buat cluster gratis (M0)
3. Setup Database User di "Database Access"
4. Whitelist IP: "Allow Access from Anywhere" di "Network Access"
5. Get Connection String dari tombol "Connect"
6. Paste ke environment variables Vercel

### 3. Create Vercel Blob Store
1. Masih di tab **Storage**, klik **Create Store** lagi
2. Pilih **Blob**
3. Beri nama (misal: `foto-absensi`)
4. Klik **Create**
5. Copy **BLOB_READ_WRITE_TOKEN** yang muncul

## Deploy ke Vercel

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables di Vercel
1. Di dashboard project Vercel, klik **Settings** → **Environment Variables**
2. Tambahkan variable berikut (jika belum auto-generate):

```
MONGODB_URI = mongodb+srv://username:password@cluster.xxxxx.mongodb.net/absensi_db?retryWrites=true&w=majority
BLOB_READ_WRITE_TOKEN = vercel_blob_rw_************
ADMIN_USERNAME = admin
ADMIN_PASSWORD = your-secure-password
SESSION_SECRET = your-random-secret-key-here
```

**Note:** Ganti `ADMIN_PASSWORD` dan `SESSION_SECRET` dengan nilai yang aman untuk production!

### 3. Push ke GitHub
```bash
git add .
git commit -m "Setup MongoDB Atlas and Vercel Blob"
git push
```

### 4. Auto Deploy
- Vercel akan otomatis deploy setiap push ke GitHub
- Atau manual trigger deploy di dashboard Vercel

## Development Local

### 1. Install dependencies
```bash
npm install
```

### 2. Setup environment variables
Copy `.env.example` ke `.env` dan isi dengan credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
MONGODB_URI="mongodb+srv://username:password@cluster.xxxxx.mongodb.net/absensi_db?retryWrites=true&w=majority"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_************"
NODE_ENV="development"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
SESSION_SECRET="your-secret-key"
```

**Cara mendapatkan credentials:**
- **MONGODB_URI** dan **BLOB_READ_WRITE_TOKEN**: Copy dari Vercel Dashboard → Settings → Environment Variables
- Atau setup manual MongoDB Atlas seperti di bagian "Setup Storage"

### 3. Jalankan server
```bash
npm run dev
```

### 4. Akses aplikasi
- Login: http://localhost:3000/login (gunakan username & password dari .env)
- Dashboard: http://localhost:3000 (memerlukan login)
- Form Absen: http://localhost:3000/absen

**Default Login:**
- Username: admin
- Password: admin123

(Bisa diubah di file `.env`)

## API Endpoints

### Login
```
POST /api/login
Content-Type: application/json

Body:
{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "message": "Login berhasil"
}
```

### Logout
```
POST /api/logout

Response:
{
  "success": true,
  "message": "Logout berhasil"
}
```

### Check Auth Status
```
GET /api/auth-status

Response:
{
  "success": true,
  "isAuthenticated": true,
  "username": "admin"
}
```

### Submit Absensi
```
POST /submit-absensi
Content-Type: multipart/form-data

Body:
- nama: string
- area: string
- jenis: string
- waktuMulai: string
- waktuSelesai: string
- desc: string
- foto: file (image)
- timestamp: string (optional)
```

### Get All Absensi
```
GET /api/absensi
Response: {
  success: boolean,
  data: Array<Absensi>
}
```

### Export to Excel
```
GET /api/export-excel
Response: Excel file download
```

### Health Check
```
GET /api/health
Response: {
  success: boolean,
  message: string,
  timestamp: string
}
```

## MongoDB Schema

Collection: `absensi`

```javascript
{
  _id: ObjectId,
  timestamp: Date,
  nama: String,
  area: String,
  jenis: String,
  waktuMulai: String,
  waktuSelesai: String,
  deskripsi: String,
  foto: String (URL),
  createdAt: Date
}
```

## Free Tier Limits

**MongoDB Atlas (Free):**
- 512 MB storage
- Shared RAM
- Unlimited connections
- ~500,000+ documents capacity

**Vercel Blob (Free):**
- 500 MB file storage
- 5 GB bandwidth/bulan
- ~500-1,000 photos capacity

**Vercel (Free):**
- 100 GB bandwidth/bulan
- Serverless function executions unlimited
- 100 deployments/day

## Troubleshooting

### Error: "MongoServerError: bad auth"
- Pastikan password di connection string sudah benar
- Jangan lupa encode special characters di password

### Error: "Connection timeout"
- Cek Network Access di MongoDB Atlas
- Pastikan IP sudah di-whitelist (atau allow from anywhere)

### Error: "BLOB_READ_WRITE_TOKEN not found"
- Pastikan environment variable sudah diset di Vercel
- Restart deployment setelah tambah env variable

## Cara Clone dan Setup dari Git

### 1. Clone Repository
```bash
# Clone dari GitHub
git clone <URL_REPOSITORY_ANDA>

# Masuk ke folder project
cd dashboardkegiatan
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
# Copy file .env.example menjadi .env
copy .env.example .env
```

Edit file `.env` dengan credentials dari Vercel:
- Buka Vercel Dashboard → Project → Settings → Environment Variables
- Copy semua nilai dan paste ke `.env` lokal

### 4. Jalankan Aplikasi
```bash
# Development mode (dengan auto-reload)
npm run dev

# Production mode
npm start
```

### 5. Push Perubahan ke Git
```bash
# Cek status perubahan
git status

# Tambahkan file yang diubah
git add .

# Commit dengan pesan yang jelas
git commit -m "Deskripsi perubahan"

# Push ke GitHub
git push origin main
```

**Auto Deploy:**
Setelah push, Vercel akan otomatis detect, build, dan deploy aplikasi.

## License
MIT
