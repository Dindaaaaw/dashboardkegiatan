# Dashboard Absensi

Aplikasi absensi sederhana menggunakan Node.js, Express, MongoDB Atlas, dan Vercel Blob.

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Storage**: Vercel Blob
- **Deployment**: Vercel Serverless

## Setup MongoDB Atlas

### 1. Buat Akun MongoDB Atlas
1. Daftar gratis di: https://www.mongodb.com/cloud/atlas/register
2. Buat cluster gratis (pilih region terdekat)
3. Tunggu cluster selesai dibuat (~3 menit)

### 2. Setup Database User
1. Di sidebar, klik **Database Access**
2. Klik **Add New Database User**
3. Pilih **Password** authentication
4. Buat username dan password (simpan baik-baik!)
5. Database Privileges: **Read and write to any database**
6. Klik **Add User**

### 3. Whitelist IP Address
1. Di sidebar, klik **Network Access**
2. Klik **Add IP Address**
3. Pilih **Allow Access from Anywhere** (untuk development)
4. Klik **Confirm**

### 4. Get Connection String
1. Di sidebar, klik **Database**
2. Klik tombol **Connect** pada cluster Anda
3. Pilih **Connect your application**
4. Copy connection string (format: `mongodb+srv://...`)
5. **Ganti `<password>` dengan password user Anda**

## Setup Vercel Blob

### 1. Buka Vercel Dashboard
1. Buka: https://vercel.com/dashboard
2. Pilih project Anda
3. Klik tab **Storage**

### 2. Create Blob Store
1. Klik **Create Store** → Pilih **Blob**
2. Beri nama (misal: `foto-absensi`)
3. Klik **Create**
4. Copy **BLOB_READ_WRITE_TOKEN**

## Deploy ke Vercel

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables di Vercel
1. Di dashboard project Vercel, klik **Settings** → **Environment Variables**
2. Tambahkan variable berikut:

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
```

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

## License
MIT
