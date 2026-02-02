const Database = require('better-sqlite3');
try {
    const db = new Database('test.db', { verbose: console.log });
    db.exec('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY)');
    const stmt = db.prepare('INSERT INTO test DEFAULT VALUES');
    const info = stmt.run();
    console.log('Success:', info);
} catch (e) {
    console.error('Failed:', e);
}
