import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openDb() {
  const dbPath = path.resolve(__dirname, '../../database/medicdata.db');
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

export async function initDb() {
  const db = await openDb();

  // Usuarios (pacientes y profesionales)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName     TEXT    NOT NULL,
      lastName      TEXT    NOT NULL,
      phone         TEXT,
      email         TEXT    UNIQUE NOT NULL,
      username      TEXT    UNIQUE NOT NULL,
      password      TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK(role IN ('patient', 'professional')),
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Datos del profesional (matrícula, especialidad)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS professional_profiles (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL UNIQUE,
      especialidad    TEXT,
      matricula       TEXT,
      institucion     TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Historial médico estructurado por secciones
  await db.exec(`
    CREATE TABLE IF NOT EXISTS medical_records (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL,
      professional_id INTEGER NOT NULL,
      tipo            TEXT NOT NULL,
      -- tipos: 'diagnostico' | 'medicacion' | 'alergia' | 'cirugia' | 'vacuna' | 'estudio' | 'nota'
      titulo          TEXT NOT NULL,
      descripcion     TEXT,
      fecha_registro  DATE,
      activo          INTEGER DEFAULT 1,
      -- 1 = vigente, 0 = dado de alta / discontinuado
      acepta_paciente INTEGER DEFAULT 0,
      -- 0 = pendiente de confirmación, 1 = aceptado, 2 = rechazado
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id)      REFERENCES users(id),
      FOREIGN KEY (professional_id) REFERENCES users(id)
    );
  `);

  // Tokens QR temporales (expiran a los 15 minutos)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS qr_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id  INTEGER NOT NULL,
      token       TEXT    NOT NULL UNIQUE,
      expires_at  DATETIME NOT NULL,
      used        INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id)
    );
  `);

  // Log de accesos al historial (auditoría — requerido por Ley 25.326)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS access_log (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id      INTEGER NOT NULL,
      accessed_by     INTEGER NOT NULL,
      metodo          TEXT DEFAULT 'qr',
      -- 'qr' | 'directo'
      accessed_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id)  REFERENCES users(id),
      FOREIGN KEY (accessed_by) REFERENCES users(id)
    );
  `);

  return db;
}
