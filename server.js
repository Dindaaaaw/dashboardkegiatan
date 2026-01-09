require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const { put } = require('@vercel/blob');
const { getCollection } = require('./lib/mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// List of Employee Names
const employeeNames = [
    'Andri Apriansyah',
    'Uli Hariyono',
    'Muhammad Redo Firdaus',
    'Ansori',
    'Andita',
    'Dwi Anugrah Sefrina Handayani',
    'Sefian Hadi',
    'Sobirin'
];

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('.')); 

// Setup multer
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

// Route View
app.get('/absen', (req, res) => { res.sendFile(path.join(__dirname, 'ddekk.html')); });
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'dashboard.html')); });
app.get('/dashboard', (req, res) => { res.sendFile(path.join(__dirname, 'dashboard.html')); });

// API Get Employee Names
app.get('/api/employees', (req, res) => {
    res.json({ success: true, data: employeeNames });
});

// ==========================================
// ROUTE SUBMIT (SUDAH DIEDIT)
// ==========================================
app.post('/submit-absensi', upload.single('foto'), async (req, res) => {
    try {
        // Edit di sini: waktuMulai & waktuSelesai diganti rentangWaktu
        const { nama, area, jenis, rentangWaktu, desc, timestamp, consent } = req.body;

        // Normalize area: could be string or array depending on client
        let areaValue = area;
        if (Array.isArray(area)) {
            areaValue = area.join(', ');
        } else if (typeof area === 'string') {
            areaValue = area.trim();
        }

        // Validasi nama (harus dari daftar atau kosong untuk backward compatibility)
        const namaValue = nama ? nama.trim() : '';
        // Normalize consent value from client (may be 'true'/'false' or boolean)
        const consentValue = consent === 'true' || consent === true;

        // Validasi data (disesuaikan dengan field baru)
        if (!namaValue || !areaValue || !jenis || !rentangWaktu || !desc || !consentValue) {
            return res.status(400).json({ 
                success: false, 
                message: 'Semua field harus diisi dan persetujuan harus dicentang!' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'Foto harus diupload!' 
            });
        }

        // Upload ke Vercel Blob
        const cleanFilename = req.file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        const filename = `foto_${Date.now()}_${cleanFilename}`;
        const blob = await put(filename, req.file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: req.file.mimetype,
            addRandomSuffix: false
        });

        // Simpan ke MongoDB
        const collection = await getCollection('absensi');
        const dataAbsensi = {
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            nama: namaValue,
            area: areaValue,
            jenis,
            rentangWaktu, // Field baru
            deskripsi: desc,
            foto: blob.url,
            consent: consentValue,
            createdAt: new Date()
        };

        const result = await collection.insertOne(dataAbsensi);
        
        res.json({ 
            success: true, 
            message: 'Data absensi berhasil disimpan!',
            data: { id: result.insertedId, ...dataAbsensi }
        });

    } catch (error) {
        console.error('Error detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Get Data
app.get('/api/absensi', async (req, res) => {
    try {
        const collection = await getCollection('absensi');
        const allAbsensi = await collection.find({}).sort({ timestamp: -1 }).toArray();
        const formattedData = allAbsensi.map(item => ({
            id: item._id,
            timestamp: item.timestamp,
            nama: item.nama,
            area: item.area,
            jenis: item.jenis,
            rentangWaktu: item.rentangWaktu, // Update field
            deskripsi: item.deskripsi,
            foto: item.foto,
            consent: !!item.consent
        }));
        res.json({ success: true, data: formattedData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Export Excel (SUDAH DIEDIT)
app.get('/api/export-excel', async (req, res) => {
    try {
        const collection = await getCollection('absensi');
        const allAbsensi = await collection.find({}).sort({ timestamp: -1 }).toArray();
        
        if (allAbsensi.length === 0) return res.status(404).json({ success: false, message: 'Data kosong' });

        const excelData = allAbsensi.map((item, index) => {
            const date = new Date(item.timestamp);
            return {
                'No': index + 1,
                'Tanggal': date.toLocaleDateString('id-ID'),
                'Nama': item.nama,
                'Area': item.area,
                'Jenis Pekerjaan': item.jenis,
                'Rentang Waktu': item.rentangWaktu, // Kolom disatukan biar rapi
                'Deskripsi': item.deskripsi,
                'Consent': item.consent ? 'Ya' : 'Tidak',
                'URL Foto': item.foto
            };
        });

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Data Absensi');
        const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="Absensi.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Delete Data
app.delete('/api/absensi/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validasi ID format
        if (!id || id.length !== 24) {
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }

        const collection = await getCollection('absensi');
        const { ObjectId } = require('mongodb');
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
        }
        
        res.json({ success: true, message: 'Data berhasil dihapus' });
    } catch (error) {
        console.error('Error detail:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Health Check
app.get('/api/health', async (req, res) => {
    try {
        const collection = await getCollection('absensi');
        await collection.findOne({});
        res.json({ success: true, message: 'Running' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => { console.log(`Running on http://localhost:${PORT}`); });
}

module.exports = app;