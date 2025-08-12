import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function openDb() {
  return open({
    filename: './medicdata.db',
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
