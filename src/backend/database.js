import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

// Para obtener la ruta absoluta del directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openDb() {
  // Ruta absoluta hacia la base de datos
  const dbPath = path.resolve(__dirname, '../../database/medicdata.db');
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

export async function initDb() {
  const db = await openDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT,
        lastName TEXT,
        phone TEXT,
        email TEXT UNIQUE,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS medical_data (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER,
       data TEXT,
       last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  return db;
}
