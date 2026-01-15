const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware - CORS CONFIGURATION FOR LOCAL NETWORK
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);

        // Allow localhost on any port
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }

        // Allow any IP address on local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        const localNetworkPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
        if (origin && localNetworkPattern.test(origin)) {
            return callback(null, true);
        }

        // For development, allow all origins (comment out in production if needed)
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// SESSION CONFIGURATION
app.use(session({
    secret: 'brandon-tomes-subaru-fleet-secret-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,      // Set to true only if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax',
        path: '/'
    },
    name: 'fleet.sid'
}));

// Debug middleware (comment out in production)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    console.log('Session ID:', req.sessionID);
    console.log('User ID:', req.session?.userId);
    next();
});

// Ensure data directory exists (use local path for development, /app/data for Docker)
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory:', dataDir);
}

// Ensure documents directory exists
const documentsDir = path.join(dataDir, 'documents');
if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir, { recursive: true });
    console.log('Created documents directory:', documentsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, documentsDir);
    },
    filename: function (req, file, cb) {
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Initialize SQLite database
const dbPath = path.join(dataDir, 'fleet-inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database at', dbPath);
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Inventory table - UPDATED WITH operationCompany
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY,
            stockNumber TEXT NOT NULL,
            vin TEXT NOT NULL,
            year INTEGER NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            trim TEXT NOT NULL,
            color TEXT NOT NULL,
            fleetCompany TEXT,
            operationCompany TEXT,
            status TEXT NOT NULL,
            dateAdded DATETIME NOT NULL,
            inStockDate TEXT,
            customer TEXT,
            documents TEXT,
            pickupDate TEXT,
            pickupTime TEXT,
            pickupNotes TEXT,
            tradeInId INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Sold Vehicles table - UPDATED WITH operationCompany
        db.run(`CREATE TABLE IF NOT EXISTS sold_vehicles (
            id INTEGER PRIMARY KEY,
            stockNumber TEXT NOT NULL,
            vin TEXT NOT NULL,
            year INTEGER NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            trim TEXT NOT NULL,
            color TEXT NOT NULL,
            fleetCompany TEXT,
            operationCompany TEXT,
            status TEXT NOT NULL,
            dateAdded DATETIME NOT NULL,
            inStockDate TEXT,
            customer TEXT,
            documents TEXT,
            tradeInId INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Trade-Ins (Fleet Returns) table
        db.run(`CREATE TABLE IF NOT EXISTS trade_ins (
            id INTEGER PRIMARY KEY,
            stockNumber TEXT,
            vin TEXT NOT NULL,
            year INTEGER NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            trim TEXT,
            color TEXT NOT NULL,
            mileage INTEGER,
            notes TEXT,
            pickedUp INTEGER DEFAULT 0,
            pickedUpDate TEXT,
            dateAdded DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Documents table
        db.run(`CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            vehicleId INTEGER NOT NULL,
            fileName TEXT NOT NULL,
            filePath TEXT NOT NULL,
            fileSize INTEGER NOT NULL,
            uploadDate DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Create default admin user (username: Zaid, password: 1234)
        const hashedPassword = bcrypt.hashSync('1234', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`,
            ['Zaid', hashedPassword],
            (err) => {
                if (err) {
                    console.error('Error creating default user:', err);
                } else {
                    console.log('Default admin user created/verified (username: Zaid, password: 1234)');
                }
            }
        );
    });
}

// Authentication middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    console.log('Authentication failed - no session or userId');
    res.status(401).json({ error: 'Not authenticated' });
}

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    console.log('Login attempt:', username, 'from origin:', req.headers.origin);

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Password comparison error:', err);
                return res.status(500).json({ error: 'Authentication error' });
            }

            if (!isMatch) {
                console.log('Password mismatch for user:', username);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Set session data
            req.session.userId = user.id;
            req.session.username = user.username;

            // Save session explicitly before responding
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    return res.status(500).json({ error: 'Session creation failed' });
                }

                console.log('Login successful for user:', username, 'Session ID:', req.sessionID);
                res.json({ success: true, username: user.username });
            });
        });
    });
});

// Logout
app.post('/api/logout', (req, res) => {
    console.log('Logout request for session:', req.sessionID);
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('fleet.sid');
        console.log('Logout successful');
        res.json({ success: true });
    });
});

// Check auth status
app.get('/api/auth/status', (req, res) => {
    console.log('Auth status check - Session ID:', req.sessionID, 'User ID:', req.session?.userId, 'Origin:', req.headers.origin);
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// Alias for frontend compatibility
app.get('/api/auth-check', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({ authenticated: true, username: req.session.username });
    } else {
        res.json({ authenticated: false });
    }
});

// ==================== INVENTORY ROUTES ====================

// Get all inventory
app.get('/api/inventory', isAuthenticated, (req, res) => {
    db.all('SELECT * FROM inventory ORDER BY dateAdded DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching inventory:', err);
            return res.status(500).json({ error: err.message });
        }
        // Parse JSON fields
        const inventory = rows.map(row => ({
            ...row,
            customer: row.customer ? JSON.parse(row.customer) : null,
            documents: row.documents ? JSON.parse(row.documents) : []
        }));
        res.json(inventory);
    });
});

// Add vehicle to inventory - UPDATED WITH operationCompany and inStockDate
app.post('/api/inventory', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `INSERT INTO inventory
        (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, operationCompany, status, dateAdded, inStockDate, customer, documents)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        vehicle.id,
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.color,
        vehicle.fleetCompany || '',
        vehicle.operationCompany || '',
        vehicle.status,
        vehicle.dateAdded || new Date().toISOString(),
        vehicle.inStockDate || null,
        vehicle.customer ? JSON.stringify(vehicle.customer) : null,
        vehicle.documents ? JSON.stringify(vehicle.documents) : '[]'
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error adding vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Vehicle added successfully, ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// Update vehicle - UPDATED WITH operationCompany and inStockDate
app.put('/api/inventory/:id', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `UPDATE inventory SET
        stockNumber = ?, vin = ?, year = ?, make = ?, model = ?, trim = ?,
        color = ?, fleetCompany = ?, operationCompany = ?, status = ?, customer = ?, documents = ?,
        pickupDate = ?, pickupTime = ?, pickupNotes = ?, tradeInId = ?, inStockDate = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

    const params = [
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.color,
        vehicle.fleetCompany || '',
        vehicle.operationCompany || '',
        vehicle.status,
        vehicle.customer ? JSON.stringify(vehicle.customer) : null,
        vehicle.documents ? JSON.stringify(vehicle.documents) : '[]',
        vehicle.pickupDate || null,
        vehicle.pickupTime || null,
        vehicle.pickupNotes || null,
        vehicle.tradeInId || null,
        vehicle.inStockDate || null,
        vehicle.id
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error updating vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Vehicle updated successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Delete vehicle
app.delete('/api/inventory/:id', isAuthenticated, (req, res) => {
    db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            console.error('Error deleting vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Vehicle deleted successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Mark vehicle as sold - moves from inventory to sold_vehicles
app.post('/api/inventory/:id/mark-sold', isAuthenticated, async (req, res) => {
    const vehicleId = req.params.id;
    const soldData = req.body;

    try {
        // Get the vehicle from inventory
        const vehicle = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM inventory WHERE id = ?', [vehicleId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        // Parse existing customer data
        let existingCustomer = {};
        try {
            existingCustomer = vehicle.customer ? JSON.parse(vehicle.customer) : {};
        } catch (e) {
            console.error('Error parsing customer data:', e);
        }

        // Merge with sold data to create customer object
        const customerData = {
            ...existingCustomer,
            name: soldData.customerName || existingCustomer.name || '',
            saleAmount: soldData.saleAmount,
            saleDate: soldData.saleDate,
            paymentMethod: soldData.paymentMethod,
            paymentReference: soldData.paymentReference,
            notes: soldData.notes || existingCustomer.notes || '',
        };

        // Start a transaction to ensure atomicity
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        try {
            // Create trade-in if provided
            let tradeInId = null;
            if (soldData.hasTradeIn && soldData.tradeIn) {
                const tradeIn = soldData.tradeIn;
                // Generate stock number for trade-in (original vehicle stock number + '-A')
                const tradeInStockNumber = `${vehicle.stockNumber}-A`;

                const tradeInResult = await new Promise((resolve, reject) => {
                    db.run(`INSERT INTO trade_ins (stockNumber, vin, year, make, model, trim, color, mileage, notes, dateAdded)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            tradeInStockNumber,
                            tradeIn.vin,
                            tradeIn.year,
                            tradeIn.make,
                            tradeIn.model,
                            tradeIn.trim || '',
                            tradeIn.color,
                            tradeIn.mileage || null,
                            `Trade-in from sale of ${vehicle.stockNumber}`,
                            new Date().toISOString()
                        ],
                        function (err) {
                            if (err) reject(err);
                            else resolve({ id: this.lastID });
                        }
                    );
                });
                tradeInId = tradeInResult.id;
                console.log('Created trade-in vehicle:', tradeInStockNumber, 'ID:', tradeInId);
            }

            // Insert into sold_vehicles
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO sold_vehicles 
                        (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, operationCompany, status, dateAdded, inStockDate, customer, documents, tradeInId)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        vehicle.id,
                        vehicle.stockNumber,
                        vehicle.vin,
                        vehicle.year,
                        vehicle.make,
                        vehicle.model,
                        vehicle.trim,
                        vehicle.color,
                        vehicle.fleetCompany || '',
                        vehicle.operationCompany || '',
                        'sold',
                        vehicle.dateAdded,
                        vehicle.inStockDate,
                        JSON.stringify(customerData),
                        vehicle.documents || '[]',
                        tradeInId
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID });
                    }
                );
            });

            // Delete from inventory
            await new Promise((resolve, reject) => {
                db.run('DELETE FROM inventory WHERE id = ?', [vehicleId], function (err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                });
            });

            // Commit the transaction
            await new Promise((resolve, reject) => {
                db.run('COMMIT', (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            console.log('Vehicle marked as sold:', vehicle.stockNumber);
            res.json({
                success: true,
                message: 'Vehicle marked as sold',
                tradeInId: tradeInId
            });

        } catch (transactionError) {
            // Rollback the transaction if any operation fails
            console.error('Transaction error, rolling back:', transactionError);
            await new Promise((resolve) => {
                db.run('ROLLBACK', () => resolve());
            });
            throw transactionError;
        }

    } catch (error) {
        console.error('Error marking vehicle as sold:', error);
        res.status(500).json({ error: error.message });
    }
});

// Fix in-stock dates for in-transit vehicles (utility endpoint)
app.post('/api/inventory/fix-intransit-dates', isAuthenticated, (req, res) => {
    db.run('UPDATE inventory SET inStockDate = NULL WHERE status = ?', ['in-transit'], function (err) {
        if (err) {
            console.error('Error fixing in-transit dates:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Fixed in-stock dates for in-transit vehicles, changes:', this.changes);
        res.json({ success: true, changes: this.changes, message: `Cleared in-stock dates for ${this.changes} in-transit vehicle(s)` });
    });
});

// ==================== SOLD VEHICLES ROUTES ====================

// Get all sold vehicles
app.get('/api/sold-vehicles', isAuthenticated, (req, res) => {
    db.all('SELECT * FROM sold_vehicles ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            console.error('Error fetching sold vehicles:', err);
            return res.status(500).json({ error: err.message });
        }
        const soldVehicles = rows.map(row => ({
            ...row,
            customer: row.customer ? JSON.parse(row.customer) : null,
            documents: row.documents ? JSON.parse(row.documents) : []
        }));
        res.json(soldVehicles);
    });
});

// Add sold vehicle - UPDATED WITH operationCompany
app.post('/api/sold-vehicles', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `INSERT INTO sold_vehicles
        (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, operationCompany, status, dateAdded, inStockDate, customer, documents, tradeInId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        vehicle.id,
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.color,
        vehicle.fleetCompany || '',
        vehicle.operationCompany || '',
        vehicle.status,
        vehicle.dateAdded || new Date().toISOString(),
        vehicle.inStockDate || null,
        vehicle.customer ? JSON.stringify(vehicle.customer) : null,
        vehicle.documents ? JSON.stringify(vehicle.documents) : '[]',
        vehicle.tradeInId || null
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error adding sold vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Sold vehicle added successfully, ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// Delete sold vehicle
app.delete('/api/sold-vehicles/:id', isAuthenticated, (req, res) => {
    db.run('DELETE FROM sold_vehicles WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            console.error('Error deleting sold vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Sold vehicle deleted successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Update sold vehicle
app.put('/api/sold-vehicles/:id', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `UPDATE sold_vehicles SET
        stockNumber = ?, vin = ?, year = ?, make = ?, model = ?, trim = ?,
        color = ?, fleetCompany = ?, operationCompany = ?, status = ?, customer = ?, documents = ?,
        tradeInId = ?, inStockDate = ?
        WHERE id = ?`;

    const params = [
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.color,
        vehicle.fleetCompany || '',
        vehicle.operationCompany || '',
        vehicle.status,
        vehicle.customer ? JSON.stringify(vehicle.customer) : null,
        vehicle.documents ? JSON.stringify(vehicle.documents) : '[]',
        vehicle.tradeInId || null,
        vehicle.inStockDate || null,
        vehicle.id
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error updating sold vehicle:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Sold vehicle updated successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// ==================== TRADE-INS (FLEET RETURNS) ROUTES ====================

// Get all trade-ins
app.get('/api/trade-ins', isAuthenticated, (req, res) => {
    const sql = `
        SELECT t.*, 
               s.customer as sold_customer, 
               s.fleetCompany, 
               s.operationCompany 
        FROM trade_ins t
        LEFT JOIN sold_vehicles s ON s.tradeInId = t.id
        ORDER BY t.dateAdded DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching trade-ins:', err);
            return res.status(500).json({ error: err.message });
        }

        console.log(`Found ${rows.length} trade-ins`);
        if (rows.length > 0) {
            console.log('Sample trade-in raw data (first row):', {
                id: rows[0].id,
                vin: rows[0].vin,
                sold_customer_exists: !!rows[0].sold_customer,
                fleetCompany: rows[0].fleetCompany,
                operationCompany: rows[0].operationCompany
            });
        }

        const tradeIns = rows.map(row => {
            let customerName = '';
            if (row.sold_customer) {
                try {
                    const customerData = JSON.parse(row.sold_customer);
                    customerName = customerData.name || '';
                } catch (e) {
                    console.error('Error parsing customer data for trade-in:', row.id);
                }
            }

            return {
                ...row,
                customerName,
                // Remove the raw customer string to keep response clean
                sold_customer: undefined
            };
        });

        res.json(tradeIns);
    });
});


// Add trade-in
app.post('/api/trade-ins', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `INSERT INTO trade_ins 
        (id, stockNumber, vin, year, make, model, trim, color, mileage, notes, pickedUp, pickedUpDate, dateAdded)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        vehicle.id,
        vehicle.stockNumber || null,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim || '',
        vehicle.color,
        vehicle.mileage || null,
        vehicle.notes || '',
        vehicle.pickedUp ? 1 : 0,
        vehicle.pickedUpDate || null,
        vehicle.dateAdded
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error adding trade-in:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Trade-in added successfully, ID:', this.lastID);
        res.json({ success: true, id: this.lastID });
    });
});

// Update trade-in
app.put('/api/trade-ins/:id', isAuthenticated, (req, res) => {
    const vehicle = req.body;
    const sql = `UPDATE trade_ins SET 
        stockNumber = ?, vin = ?, year = ?, make = ?, model = ?, trim = ?,
        color = ?, mileage = ?, notes = ?, pickedUp = ?, pickedUpDate = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;

    const params = [
        vehicle.stockNumber || null,
        vehicle.vin,
        vehicle.year,
        vehicle.make,
        vehicle.model,
        vehicle.trim || '',
        vehicle.color,
        vehicle.mileage || null,
        vehicle.notes || '',
        vehicle.pickedUp ? 1 : 0,
        vehicle.pickedUpDate || null,
        vehicle.id
    ];

    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error updating trade-in:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Trade-in updated successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Delete trade-in
app.delete('/api/trade-ins/:id', isAuthenticated, (req, res) => {
    db.run('DELETE FROM trade_ins WHERE id = ?', [req.params.id], function (err) {
        if (err) {
            console.error('Error deleting trade-in:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Trade-in deleted successfully, changes:', this.changes);
        res.json({ success: true, changes: this.changes });
    });
});

// Toggle trade-in pickup status
app.post('/api/trade-ins/:id/toggle-pickup', isAuthenticated, (req, res) => {
    const tradeInId = req.params.id;

    // First get current status
    db.get('SELECT pickedUp FROM trade_ins WHERE id = ?', [tradeInId], (err, row) => {
        if (err) {
            console.error('Error fetching trade-in:', err);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Trade-in not found' });
        }

        const newPickedUp = row.pickedUp ? 0 : 1;
        const pickedUpDate = newPickedUp ? new Date().toISOString() : null;

        db.run('UPDATE trade_ins SET pickedUp = ?, pickedUpDate = ? WHERE id = ?',
            [newPickedUp, pickedUpDate, tradeInId],
            function (err) {
                if (err) {
                    console.error('Error toggling pickup:', err);
                    return res.status(500).json({ error: err.message });
                }
                console.log('Trade-in pickup toggled:', tradeInId, 'pickedUp:', newPickedUp);
                res.json({ success: true, pickedUp: newPickedUp, pickedUpDate });
            }
        );
    });
});


// ==================== DOCUMENT MANAGEMENT ROUTES ====================

// Get documents by vehicle ID
app.get('/api/documents/vehicle/:vehicleId', isAuthenticated, (req, res) => {
    const vehicleId = req.params.vehicleId;

    db.all('SELECT * FROM documents WHERE vehicleId = ? ORDER BY uploadDate DESC', [vehicleId], (err, rows) => {
        if (err) {
            console.error('Error fetching documents:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows || []);
    });
});

// Upload document
app.post('/api/documents/upload', isAuthenticated, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { vehicleId, fileName } = req.body;

        if (!vehicleId) {
            // Delete uploaded file if vehicleId is missing
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Vehicle ID is required' });
        }

        const documentId = crypto.randomBytes(16).toString('hex');
        const uploadDate = new Date().toISOString();

        const document = {
            id: documentId,
            vehicleId: parseInt(vehicleId),
            fileName: fileName || req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            uploadDate: uploadDate
        };

        const sql = `INSERT INTO documents (id, vehicleId, fileName, filePath, fileSize, uploadDate)
                     VALUES (?, ?, ?, ?, ?, ?)`;

        const params = [
            document.id,
            document.vehicleId,
            document.fileName,
            document.filePath,
            document.fileSize,
            document.uploadDate
        ];

        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error saving document metadata:', err);
                // Delete uploaded file if database insert fails
                fs.unlinkSync(req.file.path);
                return res.status(500).json({ error: 'Failed to save document' });
            }

            console.log('Document uploaded successfully:', document.fileName);
            res.json({
                success: true,
                document: {
                    id: document.id,
                    fileName: document.fileName,
                    fileSize: document.fileSize,
                    uploadDate: document.uploadDate
                }
            });
        });

    } catch (error) {
        console.error('Error uploading document:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// View document
app.get('/api/documents/view/:id', isAuthenticated, (req, res) => {
    const documentId = req.params.id;

    db.get('SELECT * FROM documents WHERE id = ?', [documentId], (err, doc) => {
        if (err) {
            console.error('Error fetching document:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        if (!fs.existsSync(doc.filePath)) {
            return res.status(404).json({ error: 'Document file not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${doc.fileName}"`);

        const fileStream = fs.createReadStream(doc.filePath);
        fileStream.pipe(res);
    });
});

// Download document
app.get('/api/documents/download/:id', isAuthenticated, (req, res) => {
    const documentId = req.params.id;

    db.get('SELECT * FROM documents WHERE id = ?', [documentId], (err, doc) => {
        if (err) {
            console.error('Error fetching document:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        if (!fs.existsSync(doc.filePath)) {
            return res.status(404).json({ error: 'Document file not found' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${doc.fileName}"`);

        const fileStream = fs.createReadStream(doc.filePath);
        fileStream.pipe(res);
    });
});

// Delete document
app.delete('/api/documents/delete/:id', isAuthenticated, (req, res) => {
    const documentId = req.params.id;

    // First get the document info to delete the file
    db.get('SELECT * FROM documents WHERE id = ?', [documentId], (err, doc) => {
        if (err) {
            console.error('Error fetching document:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete the file from disk
        if (fs.existsSync(doc.filePath)) {
            try {
                fs.unlinkSync(doc.filePath);
                console.log('Document file deleted:', doc.filePath);
            } catch (err) {
                console.error('Error deleting document file:', err);
            }
        }

        // Delete the database record
        db.run('DELETE FROM documents WHERE id = ?', [documentId], function (err) {
            if (err) {
                console.error('Error deleting document record:', err);
                return res.status(500).json({ error: 'Failed to delete document' });
            }

            console.log('Document deleted successfully:', doc.fileName);
            res.json({ success: true });
        });
    });
});

// ==================== IMPORT/EXPORT ROUTES ====================

// Import data from JSON export file
app.post('/api/import', isAuthenticated, (req, res) => {
    try {
        const { data, duplicateAction = 'skip' } = req.body;

        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Validate export file structure
        if (!data.exportInfo || data.exportInfo.source !== 'SubaruFleetInventory') {
            return res.status(400).json({ error: 'Invalid export file. Expected SubaruFleetInventory export.' });
        }

        if (!data.inventory && !data.soldVehicles && !data.tradeIns) {
            return res.status(400).json({ error: 'Export file contains no data to import' });
        }

        const results = {
            tradeIns: { imported: 0, skipped: 0, errors: [] },
            inventory: { imported: 0, skipped: 0, errors: [] },
            soldVehicles: { imported: 0, skipped: 0, errors: [] }
        };

        // Helper function to check if VIN exists in a table
        const checkVinExists = (table, vin) => {
            return new Promise((resolve, reject) => {
                db.get(`SELECT id FROM ${table} WHERE vin = ?`, [vin], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
        };

        // Helper function to delete by VIN
        const deleteByVin = (table, vin) => {
            return new Promise((resolve, reject) => {
                db.run(`DELETE FROM ${table} WHERE vin = ?`, [vin], function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
            });
        };

        // Import trade-ins
        const importTradeIns = async () => {
            const tradeInsData = data.tradeIns || [];
            for (const tradeIn of tradeInsData) {
                try {
                    const existing = await checkVinExists('trade_ins', tradeIn.vin);

                    if (existing) {
                        if (duplicateAction === 'skip') {
                            results.tradeIns.skipped++;
                            continue;
                        } else if (duplicateAction === 'overwrite') {
                            await deleteByVin('trade_ins', tradeIn.vin);
                        }
                    }

                    await new Promise((resolve, reject) => {
                        const sql = `INSERT INTO trade_ins 
                            (id, stockNumber, vin, year, make, model, trim, color, mileage, notes, pickedUp, pickedUpDate, dateAdded)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        const params = [
                            tradeIn.id || Date.now(),
                            tradeIn.stockNumber || null,
                            tradeIn.vin,
                            tradeIn.year,
                            tradeIn.make,
                            tradeIn.model,
                            tradeIn.trim || '',
                            tradeIn.color,
                            tradeIn.mileage || null,
                            tradeIn.notes || '',
                            tradeIn.pickedUp ? 1 : 0,
                            tradeIn.pickedUpDate || null,
                            tradeIn.dateAdded || new Date().toISOString()
                        ];
                        db.run(sql, params, function (err) {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    results.tradeIns.imported++;
                } catch (err) {
                    results.tradeIns.errors.push({ vin: tradeIn.vin, error: err.message });
                }
            }
        };

        // Import inventory
        const importInventory = async () => {
            const inventoryData = data.inventory || [];
            for (const vehicle of inventoryData) {
                try {
                    const existing = await checkVinExists('inventory', vehicle.vin);

                    if (existing) {
                        if (duplicateAction === 'skip') {
                            results.inventory.skipped++;
                            continue;
                        } else if (duplicateAction === 'overwrite') {
                            await deleteByVin('inventory', vehicle.vin);
                        }
                    }

                    await new Promise((resolve, reject) => {
                        const sql = `INSERT INTO inventory
                            (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, operationCompany, status, dateAdded, inStockDate, customer, documents, pickupDate, pickupTime, pickupNotes, tradeInId)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        const params = [
                            vehicle.id || Date.now(),
                            vehicle.stockNumber,
                            vehicle.vin,
                            vehicle.year,
                            vehicle.make,
                            vehicle.model,
                            vehicle.trim,
                            vehicle.color,
                            vehicle.fleetCompany || '',
                            vehicle.operationCompany || '',
                            vehicle.status || 'in-stock',
                            vehicle.dateAdded || new Date().toISOString(),
                            vehicle.inStockDate || null,
                            vehicle.customer ? JSON.stringify(vehicle.customer) : null,
                            vehicle.documents ? JSON.stringify(vehicle.documents) : '[]',
                            vehicle.pickupDate || null,
                            vehicle.pickupTime || null,
                            vehicle.pickupNotes || null,
                            vehicle.tradeInId || null
                        ];
                        db.run(sql, params, function (err) {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    results.inventory.imported++;
                } catch (err) {
                    results.inventory.errors.push({ vin: vehicle.vin, error: err.message });
                }
            }
        };

        // Import sold vehicles
        const importSoldVehicles = async () => {
            const soldData = data.soldVehicles || [];
            for (const vehicle of soldData) {
                try {
                    const existing = await checkVinExists('sold_vehicles', vehicle.vin);

                    if (existing) {
                        if (duplicateAction === 'skip') {
                            results.soldVehicles.skipped++;
                            continue;
                        } else if (duplicateAction === 'overwrite') {
                            await deleteByVin('sold_vehicles', vehicle.vin);
                        }
                    }

                    await new Promise((resolve, reject) => {
                        const sql = `INSERT INTO sold_vehicles
                            (id, stockNumber, vin, year, make, model, trim, color, fleetCompany, operationCompany, status, dateAdded, inStockDate, customer, documents, tradeInId)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                        const params = [
                            vehicle.id || Date.now(),
                            vehicle.stockNumber,
                            vehicle.vin,
                            vehicle.year,
                            vehicle.make,
                            vehicle.model,
                            vehicle.trim,
                            vehicle.color,
                            vehicle.fleetCompany || '',
                            vehicle.operationCompany || '',
                            vehicle.status || 'sold',
                            vehicle.dateAdded || new Date().toISOString(),
                            vehicle.inStockDate || null,
                            vehicle.customer ? JSON.stringify(vehicle.customer) : null,
                            vehicle.documents ? JSON.stringify(vehicle.documents) : '[]',
                            vehicle.tradeInId || null
                        ];
                        db.run(sql, params, function (err) {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                    results.soldVehicles.imported++;
                } catch (err) {
                    results.soldVehicles.errors.push({ vin: vehicle.vin, error: err.message });
                }
            }
        };

        // Run imports in sequence
        (async () => {
            try {
                await importTradeIns();
                await importInventory();
                await importSoldVehicles();

                console.log('Import completed:', results);
                res.json({
                    success: true,
                    results: results,
                    summary: {
                        totalImported: results.tradeIns.imported + results.inventory.imported + results.soldVehicles.imported,
                        totalSkipped: results.tradeIns.skipped + results.inventory.skipped + results.soldVehicles.skipped,
                        totalErrors: results.tradeIns.errors.length + results.inventory.errors.length + results.soldVehicles.errors.length
                    }
                });
            } catch (err) {
                console.error('Import error:', err);
                res.status(500).json({ error: 'Import failed: ' + err.message, partialResults: results });
            }
        })();

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: 'Import failed: ' + error.message });
    }
});

// Export all data
app.get('/api/export', isAuthenticated, (req, res) => {
    const exportData = {
        exportInfo: {
            exportDate: new Date().toISOString(),
            version: '1.0',
            source: 'SubaruFleetInventory'
        },
        inventory: [],
        soldVehicles: [],
        tradeIns: [],
        documents: []
    };

    // Get all data in sequence
    db.all('SELECT * FROM inventory', [], (err, rows) => {
        if (err) {
            console.error('Error exporting inventory:', err);
            return res.status(500).json({ error: 'Export failed' });
        }
        exportData.inventory = rows.map(row => ({
            ...row,
            customer: row.customer ? JSON.parse(row.customer) : null,
            documents: row.documents ? JSON.parse(row.documents) : []
        }));

        db.all('SELECT * FROM sold_vehicles', [], (err, rows) => {
            if (err) {
                console.error('Error exporting sold vehicles:', err);
                return res.status(500).json({ error: 'Export failed' });
            }
            exportData.soldVehicles = rows.map(row => ({
                ...row,
                customer: row.customer ? JSON.parse(row.customer) : null,
                documents: row.documents ? JSON.parse(row.documents) : []
            }));

            db.all('SELECT * FROM trade_ins', [], (err, rows) => {
                if (err) {
                    console.error('Error exporting trade-ins:', err);
                    return res.status(500).json({ error: 'Export failed' });
                }
                exportData.tradeIns = rows;

                db.all('SELECT * FROM documents', [], (err, rows) => {
                    if (err) {
                        console.error('Error exporting documents:', err);
                        return res.status(500).json({ error: 'Export failed' });
                    }
                    exportData.documents = rows;

                    console.log('Export completed:', {
                        inventory: exportData.inventory.length,
                        soldVehicles: exportData.soldVehicles.length,
                        tradeIns: exportData.tradeIns.length,
                        documents: exportData.documents.length
                    });

                    res.json(exportData);
                });
            });
        });
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`===========================================`);
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Access from any device on your network`);
    console.log(`Default login: username=Zaid, password=1234`);
    console.log(`Database location: ${dbPath}`);
    console.log(`===========================================`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Database connection closed');
        process.exit(0);
    });
});
