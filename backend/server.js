// backend/server.js - DYNAMIC WITH SEPARATE COLUMNS FOR CSV DATA
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const multer = require('multer');
const xlsx = require('xlsx');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(cors({ origin: 'http://localhost:5001', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== SQLITE DATABASE ==========
const dbPath = path.join(__dirname, 'churn_data.db');
const db = new sqlite3.Database(dbPath);

// Users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Check if customers table exists, if not create a basic one
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'", (err, row) => {
    if (!row) {
        db.run(`
            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                algorithm TEXT DEFAULT 'logistic_regression',
                predicted_churn_probability REAL,
                churn_risk_category TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                age_group TEXT,
                subscription_duration TEXT,
                subscription_plan TEXT,
                monthly_spend TEXT,
                usage_frequency TEXT,
                nps_score TEXT,
                content_satisfaction TEXT,
                value_perception TEXT,
                churn_likelihood TEXT,
                switching_behavior TEXT,
                account_sharing TEXT,
                competitor_awareness TEXT,
                bundling_preference TEXT,
                payment_method TEXT,
                primary_platform TEXT
            )
        `);
        console.log("✅ Created basic customers table");
    }
});

// Function to add columns dynamically if they don't exist
function addColumnIfNotExists(tableName, columnName, columnType) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) return reject(err);
            const columnExists = columns.some(col => col.name === columnName);
            if (!columnExists) {
                db.run(`ALTER TABLE ${tableName} ADD COLUMN "${columnName}" ${columnType}`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    });
}

// ========== RISK CALCULATION - IMPROVED ACCURACY ==========
function calculateRisk(csvData) {
    let riskScore = 0.5;  // Start at 50% base probability
    
    // Parse numeric values
    let npsScore = parseInt(csvData.nps_score);
    let contentSat = parseInt(csvData.content_satisfaction);
    
    // === HIGH RISK FACTORS (Increase churn probability) ===
    
    // Age Group impact
    if (csvData.age_group === 'Under 18') {
        riskScore += 0.20;
    } else if (csvData.age_group === '35+') {
        riskScore -= 0.10;
    }
    
    // Subscription Duration impact
    let duration = (csvData.subscription_duration || '').toLowerCase();
    if (duration.includes('less than 1 month')) {
        riskScore += 0.25;
    } else if (duration.includes('1-3 months')) {
        riskScore += 0.15;
    } else if (duration.includes('more than 2 years')) {
        riskScore -= 0.20;
    } else if (duration.includes('1-2 years')) {
        riskScore -= 0.10;
    }
    
    // Subscription Plan impact
    if (csvData.subscription_plan === 'Basic') {
        riskScore += 0.15;
    } else if (csvData.subscription_plan === 'Premium') {
        riskScore -= 0.15;
    }
    
    // Usage Frequency impact
    if (csvData.usage_frequency === 'Rarely') {
        riskScore += 0.25;
    } else if (csvData.usage_frequency === 'Daily') {
        riskScore -= 0.15;
    }
    
    // NPS Score impact
    if (!isNaN(npsScore)) {
        if (npsScore <= 3) riskScore += 0.25;
        else if (npsScore <= 6) riskScore += 0.05;
        else if (npsScore >= 9) riskScore -= 0.20;
        else if (npsScore >= 7) riskScore -= 0.10;
    }
    
    // Content Satisfaction impact
    if (!isNaN(contentSat)) {
        if (contentSat <= 2) riskScore += 0.25;
        else if (contentSat === 3) riskScore += 0.05;
        else if (contentSat >= 4) riskScore -= 0.15;
    }
    
    // Value Perception impact
    let valuePer = (csvData.value_perception || '').toLowerCase();
    if (valuePer === 'poor value') {
        riskScore += 0.25;
    } else if (valuePer === 'excellent value') {
        riskScore -= 0.20;
    } else if (valuePer === 'good value') {
        riskScore -= 0.10;
    }
    
    // Churn Likelihood impact
    let churnLike = (csvData.churn_likelihood || '').toLowerCase();
    if (churnLike === 'very likely') {
        riskScore += 0.30;
    } else if (churnLike === 'not sure') {
        riskScore += 0.10;
    } else if (churnLike === 'very unlikely') {
        riskScore -= 0.20;
    }
    
    // Switching Behavior impact
    let switching = (csvData.switching_behavior || '').toLowerCase();
    if (switching.includes('switched completely')) {
        riskScore += 0.25;
    } else if (switching.includes('dropped one')) {
        riskScore += 0.15;
    } else if (switching.includes('added new')) {
        riskScore += 0.05;
    }
    
    // Competitor Awareness impact
    let competitor = (csvData.competitor_awareness || '').toLowerCase();
    if (competitor.includes('actively considering')) {
        riskScore += 0.20;
    } else if (competitor.includes('not seriously')) {
        riskScore += 0.05;
    } else if (competitor.includes('satisfied')) {
        riskScore -= 0.10;
    }
    
    // Account Sharing impact
    let sharing = (csvData.account_sharing || '').toLowerCase();
    if (sharing.includes('with friends') || sharing.includes('with family')) {
        riskScore -= 0.10;
    }
    
    // Clamp between 0 and 1
    riskScore = Math.min(0.95, Math.max(0.05, riskScore));
    
    // Determine risk level
    let riskLevel = '';
    if (riskScore >= 0.7) {
        riskLevel = 'High';
    } else if (riskScore >= 0.4) {
        riskLevel = 'Medium';
    } else {
        riskLevel = 'Low';
    }
    
    console.log(`Risk Score: ${riskScore.toFixed(3)}, Risk Level: ${riskLevel}`);
    
    return { 
        probability: parseFloat(riskScore.toFixed(3)), 
        risk_level: riskLevel 
    };
}

// ========== AUTH MIDDLEWARE ==========
function requireLogin(req, res, next) {
    if (req.session.userId) return next();
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = Buffer.from(token, 'base64').toString();
            const userId = parseInt(decoded.split(':')[0]);
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
                if (user) {
                    req.session.userId = user.id;
                    req.session.userName = user.name;
                    req.session.userEmail = user.email;
                    return next();
                }
                res.status(401).json({ success: false, message: 'Please login first' });
            });
        } catch (e) {
            res.status(401).json({ success: false, message: 'Invalid token' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Please login first' });
    }
}

// ========== SERVE FRONTEND ==========
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.use('/css', express.static(path.join(frontendPath, 'css')));
app.use('/js', express.static(path.join(frontendPath, 'js')));
app.use('/images', express.static(path.join(frontendPath, 'images')));
app.use('/static', express.static(path.join(__dirname, 'static')));

// ========== FILE UPLOAD ==========
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// ========== API ROUTES ==========

app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', service: 'AI Churn Analysis' });
});

app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: 'All fields required' });
    }
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, password], function(err) {
            if (err) {
                return res.status(500).json({ success: false, message: 'Registration failed' });
            }
            const token = Buffer.from(`${this.lastID}:${Date.now()}`).toString('base64');
            req.session.userId = this.lastID;
            req.session.userName = name;
            req.session.userEmail = email;
            res.json({ success: true, message: 'Registration successful', token: token, user: { id: this.lastID, name, email } });
        });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password], (err, user) => {
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
        req.session.userId = user.id;
        req.session.userName = user.name;
        req.session.userEmail = user.email;
        res.json({ success: true, message: 'Login successful', token: token, user: { id: user.id, name: user.name, email: user.email } });
    });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
        return res.json({ success: false, loggedIn: false });
    }
    res.json({ success: true, loggedIn: true, user: { id: req.session.userId, name: req.session.userName, email: req.session.userEmail } });
});

app.get('/api/data/customers', requireLogin, (req, res) => {
    db.all('SELECT * FROM customers WHERE user_id = ? ORDER BY id DESC', [req.session.userId], (err, rows) => {
        if (err) {
            console.error('Error fetching customers:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
        }
        res.json({ success: true, count: rows?.length || 0, data: rows || [] });
    });
});

app.post('/api/data/customer', requireLogin, (req, res) => {
    try {
        const customerData = req.body;
        const userId = req.session.userId;
        
        if (!customerData) {
            return res.status(400).json({ success: false, message: 'Customer data is required' });
        }

        const prediction = calculateRisk(customerData);
        
        db.all(`PRAGMA table_info(customers)`, (err, columns) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Database error', error: err.message });
            }
            
            const columnNames = columns.map(col => col.name);
            
            let insertColumns = ['user_id', 'algorithm', 'predicted_churn_probability', 'churn_risk_category'];
            let values = [userId, 'logistic_regression', prediction.probability, prediction.risk_level];
            
            const fields = ['age_group', 'subscription_duration', 'subscription_plan', 'monthly_spend', 
                            'usage_frequency', 'nps_score', 'content_satisfaction', 'value_perception', 
                            'churn_likelihood', 'switching_behavior', 'account_sharing', 'competitor_awareness', 
                            'bundling_preference', 'payment_method', 'primary_platform', 'suggestions'];
            
            for (let field of fields) {
                if (customerData[field] && columnNames.includes(field)) {
                    insertColumns.push(field);
                    values.push(customerData[field]);
                }
            }
            
            const placeholders = insertColumns.map(() => '?').join(', ');
            const query = `INSERT INTO customers (${insertColumns.join(', ')}) VALUES (${placeholders})`;
            
            db.run(query, values, function(err) {
                if (err) {
                    console.error('Database insert error:', err);
                    return res.status(500).json({ success: false, message: 'Failed to save data', error: err.message });
                }
                
                res.json({
                    success: true,
                    message: 'Customer data saved successfully using Logistic Regression',
                    customer_id: this.lastID,
                    prediction: prediction,
                    data: { id: this.lastID, ...customerData }
                });
            });
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/upload', requireLogin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        let rows = [];
        let headers = [];

        if (fileExt === '.csv') {
            const csvContent = fs.readFileSync(filePath, 'utf8');
            const lines = csvContent.split(/\r?\n/);
            
            let inQuote = false;
            let currentHeader = '';
            for (let i = 0; i < lines[0].length; i++) {
                const char = lines[0][i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    headers.push(currentHeader.trim());
                    currentHeader = '';
                } else {
                    currentHeader += char;
                }
            }
            headers.push(currentHeader.trim());
            
            console.log(`📊 Found ${headers.length} columns`);
            
            for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
                if (!lines[rowIdx].trim()) continue;
                
                const values = [];
                inQuote = false;
                let currentValue = '';
                
                for (let i = 0; i < lines[rowIdx].length; i++) {
                    const char = lines[rowIdx][i];
                    if (char === '"') {
                        inQuote = !inQuote;
                    } else if (char === ',' && !inQuote) {
                        values.push(currentValue.trim());
                        currentValue = '';
                    } else {
                        currentValue += char;
                    }
                }
                values.push(currentValue.trim());
                
                const row = {};
                for (let i = 0; i < headers.length; i++) {
                    row[headers[i]] = values[i] || '';
                }
                rows.push(row);
            }
        } else if (fileExt === '.xlsx' || fileExt === '.xls') {
            const workbook = xlsx.readFile(filePath);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = xlsx.utils.sheet_to_json(worksheet);
            if (rows.length > 0) {
                headers = Object.keys(rows[0]);
            }
        }

        console.log(`📊 Parsed ${rows.length} records from file`);

        if (rows.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ success: false, message: 'No valid data found in file' });
        }

        for (let header of headers) {
            let colName = header.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
            await addColumnIfNotExists('customers', colName, 'TEXT');
        }

        const userId = req.session.userId;
        let importedCount = 0;
        let errorCount = 0;

        for (let i = 0; i < rows.length; i++) {
            try {
                const rowData = rows[i];
                const prediction = calculateRisk(rowData);
                
                let columns = ['user_id', 'algorithm', 'predicted_churn_probability', 'churn_risk_category'];
                let values = [userId, 'logistic_regression', prediction.probability, prediction.risk_level];
                
                for (let header of headers) {
                    let colName = header.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
                    columns.push(`"${colName}"`);
                    values.push(rowData[header] || '');
                }
                
                const placeholders = columns.map(() => '?').join(', ');
                const query = `INSERT INTO customers (${columns.join(', ')}) VALUES (${placeholders})`;
                
                await new Promise((resolve, reject) => {
                    db.run(query, values, function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    });
                });
                importedCount++;
                
                if ((i + 1) % 10 === 0) {
                    console.log(`📊 Imported ${importedCount}/${rows.length} rows...`);
                }
            } catch (err) {
                errorCount++;
                console.error(`Error row ${i + 2}:`, err.message);
            }
        }

        fs.unlinkSync(filePath);

        console.log(`✅ Import complete: ${importedCount} imported, ${errorCount} errors`);

        res.json({
            success: true,
            message: `File processed: ${importedCount} rows imported, ${errorCount} errors`,
            stats: {
                rows_processed: rows.length,
                rows_imported: importedCount,
                errors: errorCount,
                columns: headers.length
            }
        });
    } catch (error) {
        console.error('File upload error:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: 'File processing failed', error: error.message });
    }
});

app.get('/api/analytics/overview', requireLogin, (req, res) => {
    db.get('SELECT COUNT(*) as total FROM customers WHERE user_id = ?', [req.session.userId], (err, countResult) => {
        const totalCustomers = countResult?.total || 0;
        db.get('SELECT COUNT(*) as high_risk FROM customers WHERE user_id = ? AND churn_risk_category = "High"', [req.session.userId], (err, riskResult) => {
            const highRiskCustomers = riskResult?.high_risk || 0;
            res.json({ success: true, data: { total_customers: totalCustomers, high_risk_customers: highRiskCustomers, churn_rate: totalCustomers > 0 ? ((highRiskCustomers / totalCustomers) * 100).toFixed(2) : '0.00' } });
        });
    });
});

app.get('/api/init-db', (req, res) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    res.json({ success: true, message: 'Database initialized' });
});

app.get('/api/chart-data', requireLogin, (req, res) => {
    try {
        const userId = req.session.userId;
        
        db.all('SELECT * FROM customers WHERE user_id = ?', [userId], (err, rows) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Failed to fetch data' });
            }
            
            if (!rows || rows.length === 0) {
                return res.json({ success: true, data: { risk_counts: {}, age_group_counts: {}, duration_counts: {}, probabilities: [], total_customers: 0 } });
            }
            
            let riskCounts = { High: 0, Medium: 0, Low: 0 };
            let ageGroupCounts = {};
            let durationCounts = {};
            let probabilities = [];
            
            rows.forEach(row => {
                if (row.churn_risk_category) riskCounts[row.churn_risk_category]++;
                if (row.age_group) ageGroupCounts[row.age_group] = (ageGroupCounts[row.age_group] || 0) + 1;
                if (row.subscription_duration) durationCounts[row.subscription_duration] = (durationCounts[row.subscription_duration] || 0) + 1;
                if (row.predicted_churn_probability) probabilities.push(parseFloat(row.predicted_churn_probability));
            });
            
            res.json({
                success: true,
                data: {
                    risk_counts: riskCounts,
                    age_group_counts: ageGroupCounts,
                    duration_counts: durationCounts,
                    probabilities: probabilities,
                    total_customers: rows.length
                }
            });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ========== GENERATE CHARTS ENDPOINT ==========
app.post('/api/generate-charts', requireLogin, (req, res) => {
    const pythonPath = 'C:\\Users\\HP\\AppData\\Local\\Programs\\Python\\Python310\\python.exe';
    const scriptPath = path.join(__dirname, 'chart_from_db.py');
    
    console.log('Generating charts from database...');
    
    exec(`"${pythonPath}" "${scriptPath}"`, 
        { cwd: __dirname },
        (error, stdout, stderr) => {
            if (error) {
                console.error('Error:', error);
                console.error('stderr:', stderr);
                return res.status(500).json({ success: false, message: error.message, stderr: stderr });
            }
            console.log('stdout:', stdout);
            res.json({ success: true, message: 'Charts generated successfully', output: stdout });
        }
    );
});

// ========== FRONTEND ROUTES ==========
app.get('/', (req, res) => { res.sendFile(path.join(frontendPath, 'index.html')); });
const htmlPages = ['login.html', 'register.html', 'dashboard.html', 'data-input.html', 'analysis.html', 'reports.html', 'retention.html', 'model-performance.html'];
htmlPages.forEach(page => { app.get('/' + page, (req, res) => { res.sendFile(path.join(frontendPath, page)); }); });
app.use('/uploads', express.static('uploads'));
app.all('/api/*', (req, res) => { res.status(404).json({ error: 'API route not found' }); });
app.get('*', (req, res) => { if (req.path.startsWith('/api')) return; res.sendFile(path.join(frontendPath, 'index.html')); });

// Start server
async function startServer() {
    try {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        
        app.listen(PORT, () => {
            console.log(`🚀 Server started on port ${PORT}`);
            console.log(`📡 http://localhost:${PORT}`);
            console.log(`🤖 Dynamic CSV Upload - Adds columns automatically without dropping table!`);
            console.log(`📊 Customers table will preserve existing data`);
            console.log(`📈 Improved accuracy risk calculation`);
        });
    } catch (error) {
        console.error('Failed to start:', error);
    }
}

startServer();
