const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const { put } = require('@vercel/blob');
const { getCollection } = require('./lib/mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.')); // Serve static files

// Setup multer untuk upload (memory storage untuk Vercel)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diperbolehkan!'));
        }
    }
});

// Route untuk halaman absen
app.get('/absen', (req, res) => {
    res.sendFile(path.join(__dirname, 'ddekk.html'));
});

// Route untuk halaman dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Route untuk submit absensi
app.post('/submit-absensi', upload.single('foto'), async (req, res) => {
    try {
        const { nama, area, jenis, waktuMulai, waktuSelesai, desc, timestamp } = req.body;
        
        // Validasi data
        if (!nama || !area || !jenis || !waktuMulai || !waktuSelesai || !desc) {
            return res.status(400).json({ 
                success: false, 
                message: 'Semua field harus diisi!' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'Foto harus diupload!' 
            });
        }

        // Upload foto ke Vercel Blob
        // Bersihkan nama file: hapus spasi, karakter special, dan gunakan underscore
        const cleanFilename = req.file.originalname
            .replace(/\s+/g, '_')  // Ganti spasi dengan underscore
            .replace(/[^a-zA-Z0-9._-]/g, '')  // Hapus karakter special
            .toLowerCase();  // Lowercase semua
        
        const filename = `foto_${Date.now()}_${cleanFilename}`;
        const blob = await put(filename, req.file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: req.file.mimetype,
            addRandomSuffix: false
        });

        // Simpan data ke MongoDB
        const collection = await getCollection('absensi');
        
        const dataAbsensi = {
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            nama,
            area,
            jenis,
            waktuMulai,
            waktuSelesai,
            deskripsi: desc,
            foto: blob.url,
            createdAt: new Date()
        };

        const result = await collection.insertOne(dataAbsensi);
        
        res.json({ 
            success: true, 
            message: 'Data absensi berhasil disimpan!',
            data: {
                id: result.insertedId,
                ...dataAbsensi
            }
        });

    } catch (error) {
        console.error('Error detail:', error);
        
        let errorMessage = 'Terjadi kesalahan saat menyimpan data!';
        
        if (error.message.includes('MONGODB_URI')) {
            errorMessage = 'Database tidak terhubung. Periksa MONGODB_URI di environment variables.';
        } else if (error.message.includes('BLOB')) {
            errorMessage = 'Gagal upload foto. Periksa BLOB_READ_WRITE_TOKEN di environment variables.';
        } else if (error.message.includes('MongoServerError')) {
            errorMessage = 'Koneksi ke MongoDB gagal. Periksa password dan IP whitelist.';
        }
        
        res.status(500).json({ 
            success: false, 
            message: errorMessage,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// API untuk mendapatkan semua data absensi
app.get('/api/absensi', async (req, res) => {
    try {
        const collection = await getCollection('absensi');
        
        const allAbsensi = await collection
            .find({})
            .sort({ timestamp: -1 })
            .toArray();

        // Format data untuk response
        const formattedData = allAbsensi.map(item => ({
            id: item._id,
            timestamp: item.timestamp,
            nama: item.nama,
            area: item.area,
            jenis: item.jenis,
            waktuMulai: item.waktuMulai,
            waktuSelesai: item.waktuSelesai,
            deskripsi: item.deskripsi,
            foto: item.foto
        }));

        res.json({ 
            success: true, 
            data: formattedData 
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan saat mengambil data!',
            error: error.message 
        });
    }
});

// API untuk export ke Excel
app.get('/api/export-excel', async (req, res) => {
    try {
        const collection = await getCollection('absensi');
        
        const allAbsensi = await collection
            .find({})
            .sort({ timestamp: -1 })
            .toArray();
        
        if (allAbsensi.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Tidak ada data untuk di-export' 
            });
        }

        // Prepare data for Excel
        const excelData = allAbsensi.map((item, index) => {
            const date = new Date(item.timestamp);
            return {
                'No': index + 1,
                'Tanggal': date.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                }),
                'Waktu': date.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                }),
                'Nama': item.nama,
                'Area': item.area,
                'Jenis Pekerjaan': item.jenis,
                'Waktu Mulai': item.waktuMulai,
                'Waktu Selesai': item.waktuSelesai,
                'Deskripsi': item.deskripsi,
                'URL Foto': item.foto
            };
        });

        // Create workbook and worksheet
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 5 },  // No
            { wch: 20 }, // Tanggal
            { wch: 12 }, // Waktu
            { wch: 30 }, // Nama
            { wch: 15 }, // Area
            { wch: 18 }, // Jenis Pekerjaan
            { wch: 12 }, // Waktu Mulai
            { wch: 12 }, // Waktu Selesai
            { wch: 40 }, // Deskripsi
            { wch: 60 }  // URL Foto
        ];

        xlsx.utils.book_append_sheet(workbook, worksheet, 'Data Absensi');

        // Generate Excel file
        const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        // Set headers for file download
        const fileName = `Absensi_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        
        res.send(excelBuffer);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan saat export data!',
            error: error.message 
        });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const collection = await getCollection('absensi');
        await collection.findOne({}); // Test connection
        
        res.json({ 
            success: true, 
            message: 'Server and database are running',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Database connection error',
            error: error.message
        });
    }
});

// Start server (untuk development local)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
        console.log(`Buka http://localhost:${PORT} untuk dashboard`);
        console.log(`Buka http://localhost:${PORT}/absen untuk input absensi`);
    });
}

// Export untuk Vercel
module.exports = app;
