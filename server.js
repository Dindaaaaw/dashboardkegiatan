require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const { put } = require('@vercel/blob');
const { getCollection } = require('./lib/mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - PENTING untuk Vercel!
app.set('trust proxy', 1);

// Default Employee Names (untuk inisialisasi database)
const defaultEmployeeNames = [
    'Andri Apriansyah',
    'Uli Hariyono',
    'Muhammad Redo Firdaus',
    'Ansori',
    'Andita',
    'Dwi Anugrah Sefrina Handayani',
    'Sefian Hadi',
    'Sobirin'
];

// Initialize employee names in database (jika kosong)
async function initializeEmployeeNames() {
    try {
        const collection = await getCollection('pegawai');
        const count = await collection.countDocuments({});
        
        if (count === 0) {
            // Jika collection kosong, insert default names
            const docs = defaultEmployeeNames.map(nama => ({
                nama,
                createdAt: new Date(),
                updatedAt: new Date()
            }));
            await collection.insertMany(docs);
            console.log('✅ Employee names initialized from defaults');
        }
    } catch (error) {
        console.error('Error initializing employee names:', error);
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with logging
app.use((req, res, next) => {
    if (req.path.endsWith('.png') || req.path.endsWith('.jpg') || req.path.endsWith('.jpeg')) {
        console.log('Image requested:', req.path);
    }
    next();
});
app.use(express.static('.'));

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
const sessionConfig = {
    name: 'dashboard.sid', // Custom name untuk avoid conflicts
    secret: process.env.SESSION_SECRET || 'dashboard-kegiatan-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset cookie expiry on every request
    proxy: true, // Trust proxy (important for Vercel)
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: isProduction, // true untuk HTTPS di Vercel
        sameSite: isProduction ? 'none' : 'lax', // 'none' untuk Vercel HTTPS
        path: '/',
        domain: undefined // Let Express handle it
    }
};

console.log('Session config:', {
    isProduction,
    cookieSecure: sessionConfig.cookie.secure,
    cookieSameSite: sessionConfig.cookie.sameSite
});

// Only add MongoStore if MONGODB_URI is available
if (process.env.MONGODB_URI) {
    try {
        const mongoStore = MongoStore.create({
            mongoUrl: process.env.MONGODB_URI,
            collectionName: 'sessions',
            ttl: 24 * 60 * 60, // 24 hours in seconds
            touchAfter: 3600, // Lazy session update (in seconds)
            autoRemove: 'native' // Let MongoDB automatically remove expired sessions
        });
        
        // Listen to store events
        mongoStore.on('error', (error) => {
            console.error('❌ MongoStore error:', error);
        });
        
        mongoStore.on('create', (sessionId) => {
            console.log('✅ Session created:', sessionId);
        });
        
        sessionConfig.store = mongoStore;
        console.log('✅ MongoDB session store configured successfully');
    } catch (error) {
        console.error('❌ Failed to configure MongoStore:', error);
        console.warn('⚠️  Falling back to memory store');
    }
} else {
    console.warn('⚠️  No MONGODB_URI found, using memory store (not recommended for production)');
}

app.use(session(sessionConfig));

// Auth Middleware
const requireAuth = (req, res, next) => {
    console.log('=== AUTH CHECK ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session:', req.session);
    console.log('Is Authenticated:', req.session?.isAuthenticated);
    
    if (req.session && req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/login');
};

// Check if already logged in
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        return res.redirect('/dashboard');
    }
    next();
}; 

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
app.get('/login', redirectIfAuthenticated, (req, res) => { res.sendFile(path.join(__dirname, 'login.html')); });
app.get('/absen', (req, res) => { res.sendFile(path.join(__dirname, 'ddekk.html')); });
app.get('/', requireAuth, (req, res) => { res.sendFile(path.join(__dirname, 'dashboard.html')); });
app.get('/dashboard', requireAuth, (req, res) => { res.sendFile(path.join(__dirname, 'dashboard.html')); });
app.get('/admin/pegawai', requireAuth, (req, res) => { res.sendFile(path.join(__dirname, 'admin-pegawai.html')); });

// Serve logo explicitly
app.get('/Logo.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'Logo.png'));
});

// API Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username:', username);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Session before login:', req.session);
    console.log('SessionID before:', req.sessionID);
    
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.isAuthenticated = true;
        req.session.username = username;
        
        console.log('Session data set:', {
            isAuthenticated: req.session.isAuthenticated,
            username: req.session.username,
            sessionID: req.sessionID
        });
        
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Gagal menyimpan session: ' + err.message 
                });
            }
            console.log('✅ Session saved successfully!');
            console.log('Session after save:', req.session);
            console.log('Cookie config:', {
                secure: req.session.cookie.secure,
                sameSite: req.session.cookie.sameSite,
                httpOnly: req.session.cookie.httpOnly,
                maxAge: req.session.cookie.maxAge
            });
            
            // Set cookie headers explicitly untuk memastikan
            res.cookie('dashboard.sid', req.sessionID, sessionConfig.cookie);
            
            return res.json({ 
                success: true, 
                message: 'Login berhasil',
                sessionID: req.sessionID // Debug purposes
            });
        });
    } else {
        console.log('❌ Invalid credentials');
        res.status(401).json({ success: false, message: 'Username atau password salah' });
    }
});

// API Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Gagal logout' });
        }
        res.json({ success: true, message: 'Logout berhasil' });
    });
});

// API Check Auth Status
app.get('/api/auth-status', (req, res) => {
    console.log('=== AUTH STATUS CHECK ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    console.log('Is authenticated:', req.session?.isAuthenticated);
    console.log('Cookies received:', req.headers.cookie);
    
    if (req.session && req.session.isAuthenticated) {
        return res.json({ 
            success: true, 
            isAuthenticated: true, 
            username: req.session.username,
            sessionID: req.sessionID
        });
    }
    res.json({ 
        success: false, 
        isAuthenticated: false,
        sessionID: req.sessionID,
        hasSession: !!req.session
    });
});

// API Get Employee Names (dari database)
app.get('/api/employees', async (req, res) => {
    try {
        const collection = await getCollection('pegawai');
        const pegawai = await collection.find({}).sort({ nama: 1 }).toArray();
        const names = pegawai.map(p => p.nama);
        res.json({ success: true, data: names });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.json({ success: true, data: defaultEmployeeNames }); // Fallback ke default
    }
});

// API Get All Pegawai (dengan ID untuk manage)
app.get('/api/pegawai', async (req, res) => {
    try {
        const collection = await getCollection('pegawai');
        const pegawai = await collection.find({}).sort({ nama: 1 }).toArray();
        res.json({ success: true, data: pegawai });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Add Pegawai
app.post('/api/pegawai', async (req, res) => {
    try {
        const { nama } = req.body;
        
        if (!nama || !nama.trim()) {
            return res.status(400).json({ success: false, message: 'Nama pegawai tidak boleh kosong' });
        }

        const collection = await getCollection('pegawai');
        
        // Check duplicate
        const exists = await collection.findOne({ nama: nama.trim() });
        if (exists) {
            return res.status(400).json({ success: false, message: 'Nama pegawai sudah ada' });
        }

        const result = await collection.insertOne({
            nama: nama.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        });

        res.json({ 
            success: true, 
            message: 'Pegawai berhasil ditambahkan',
            data: { _id: result.insertedId, nama: nama.trim() }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Delete Pegawai
app.delete('/api/pegawai/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || id.length !== 24) {
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }

        const collection = await getCollection('pegawai');
        const { ObjectId } = require('mongodb');
        
        const result = await collection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'Pegawai tidak ditemukan' });
        }

        res.json({ success: true, message: 'Pegawai berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
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

// API Export Excel Per Nama (FITUR BARU)
app.get('/api/export-excel-per-nama', async (req, res) => {
    try {
        const { nama } = req.query;
        
        if (!nama) {
            return res.status(400).json({ success: false, message: 'Nama harus diisi' });
        }

        const collection = await getCollection('absensi');
        const absensiPerNama = await collection.find({ nama: nama }).sort({ timestamp: -1 }).toArray();
        
        if (absensiPerNama.length === 0) {
            return res.status(404).json({ success: false, message: `Data untuk ${nama} tidak ditemukan` });
        }

        const excelData = absensiPerNama.map((item, index) => {
            const date = new Date(item.timestamp);
            return {
                'No': index + 1,
                'Tanggal': date.toLocaleDateString('id-ID'),
                'Nama': item.nama,
                'Area': item.area,
                'Jenis Pekerjaan': item.jenis,
                'Rentang Waktu': item.rentangWaktu,
                'Deskripsi': item.deskripsi,
                'Consent': item.consent ? 'Ya' : 'Tidak',
                'URL Foto': item.foto
            };
        });

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(excelData);
        xlsx.utils.book_append_sheet(workbook, worksheet, `Absensi ${nama}`);
        const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="Absensi_${nama}.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// API Delete Data (Single)
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

// API Delete Multiple Data
app.post('/api/absensi/delete-multiple', async (req, res) => {
    try {
        const { ids } = req.body;
        
        // Validasi input
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'IDs harus berupa array dan tidak boleh kosong' });
        }

        const collection = await getCollection('absensi');
        const { ObjectId } = require('mongodb');
        
        // Validasi semua ID
        const validIds = ids.filter(id => id && id.length === 24);
        if (validIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Tidak ada ID yang valid' });
        }

        // Convert string IDs to ObjectId
        const objectIds = validIds.map(id => new ObjectId(id));
        
        const result = await collection.deleteMany({ _id: { $in: objectIds } });
        
        res.json({ 
            success: true, 
            message: `${result.deletedCount} data berhasil dihapus`,
            deletedCount: result.deletedCount
        });
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

// Initialize on startup
(async () => {
    try {
        await initializeEmployeeNames();
    } catch (error) {
        console.error('Error during initialization:', error);
    }
})();

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => { console.log(`Running on http://localhost:${PORT}`); });
}

module.exports = app;