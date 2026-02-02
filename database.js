const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
let db;

// Helper para ejecutar queries (Simulado para compatibilidad con código anterior)
function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(params);
  } catch (error) {
    console.error('Error en query:', error);
    throw error;
  }
}

// Helper para obtener un solo resultado
function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.get(params);
  } catch (error) {
    console.error('Error en get:', error);
    throw error;
  }
}

// Helper para ejecutar comandos (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const info = stmt.run(params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  } catch (error) {
    console.error('Error en run:', error);
    throw error;
  }
}

// Guardar cambios en disco (No necesario con better-sqlite3, es automático)
function saveDatabase() {
  // No-op para compatibilidad
}

// Inicializar base de datos
async function initDatabase() {
  try {
    // Abrir base de datos
    db = new Database(dbPath, { verbose: console.log });
    console.log('✓ Base de datos conectada (better-sqlite3)');

    // Crear tablas
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        id_number TEXT UNIQUE NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS credit_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        interest_rate REAL NOT NULL,
        interest_type TEXT DEFAULT 'simple',
        frequency TEXT DEFAULT 'monthly',
        max_term_months INTEGER NOT NULL,
        late_fee_rate REAL DEFAULT 0,
        grace_days INTEGER DEFAULT 0,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS loan_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        credit_type_id INTEGER NOT NULL,
        requested_amount REAL NOT NULL,
        requested_term INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        reviewed_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        credit_type_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        interest_rate REAL NOT NULL,
        term_months INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        approved_date DATE,
        first_payment_date DATE,
        approved_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Pagos
    db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        principal REAL NOT NULL,
        interest REAL NOT NULL,
        late_fee REAL DEFAULT 0,
        payment_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status TEXT DEFAULT 'paid',
        receipt_number INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Tabla de configuración
    // 6. Tabla de configuración
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT
      )
    `);

    // 7. Tabla de Gastos
    // 7. Tabla de Gastos
    db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        category TEXT,
        expense_date DATE NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Tabla de Documentos
    // 8. Tabla de Documentos
    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        loan_id INTEGER,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    saveDatabase();

    // Crear usuario administrador por defecto
    const adminExists = get('SELECT id FROM users WHERE username = ?', ['admin']);

    if (!adminExists) {
      const passwordHash = bcrypt.hashSync('Admin123!', 10);
      run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        ['admin', passwordHash, 'admin']);
      console.log('✓ Usuario administrador creado: admin / Admin123!');
    }

    // Crear tipos de crédito de ejemplo
    const creditTypesCount = get('SELECT COUNT(*) as count FROM credit_types', []);

    if (!creditTypesCount || creditTypesCount.count === 0) {
      const creditTypes = [
        ['Crédito Personal', 15.0, 'simple', 'monthly', 24, 5.0, 3],
        ['Crédito Comercial', 12.0, 'simple', 'monthly', 36, 3.0, 5],
        ['Microcrédito', 20.0, 'simple', 'weekly', 12, 10.0, 0]
      ];

      creditTypes.forEach(ct => {
        run(`INSERT INTO credit_types (name, interest_rate, interest_type, frequency, max_term_months, late_fee_rate, grace_days)
             VALUES (?, ?, ?, ?, ?, ?, ?)`, ct);
      });

      console.log('✓ Tipos de crédito de ejemplo creados');
    }

    // Insertar configuración por defecto si está vacía
    const settingsCount = get('SELECT COUNT(*) as count FROM settings', []);
    if (!settingsCount || settingsCount.count === 0) {
      const defaultSettings = [
        ['company_name', 'Sistema de Gestión de Créditos', 'Nombre de la empresa que aparece en el sistema'],
        ['currency_symbol', '$', 'Símbolo de moneda para mostrar en montos'],
        ['logo_url', '', 'URL del logo de la empresa'],
        ['tax_id', '', 'Número de identificación fiscal (RUC/NIT)'],
        ['address', 'Dirección Principal', 'Dirección para recibos'],
        ['phone', '', 'Teléfono de contacto'],
        ['email', '', 'Email de contacto']
      ];

      defaultSettings.forEach(setting => {
        run('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)', setting);
      });
      console.log('✓ Configuración inicial creada');
    }

    console.log('✓ Base de datos inicializada correctamente');

  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
}

// Exportar funciones
module.exports = {
  initDatabase,
  query,
  get,
  run,
  getDb: () => db,
  saveDatabase
};
