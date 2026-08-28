import pg from 'pg';

const { Pool } = pg;

const SCHEMA = 'medicdata';

let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurado');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      options: `-c search_path=${SCHEMA},public`,
      max: 5,
    });
  }
  return pool;
}

// Traduce placeholders estilo sqlite ("?") a placeholders de Postgres ($1, $2, ...)
function toPgParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  return Array.isArray(params) ? params : [params];
}

async function query(sql, params) {
  const text = toPgParams(sql);
  const values = normalizeParams(params);
  return getPool().query(text, values);
}

// Wrapper con la misma interfaz que usaba el código con sqlite (get/all/run/exec),
// para no tener que reescribir cada consulta del resto del backend.
export async function openDb() {
  return {
    async get(sql, params) {
      const r = await query(sql, params);
      return r.rows[0];
    },
    async all(sql, params) {
      const r = await query(sql, params);
      return r.rows;
    },
    async run(sql, params) {
      let text = sql.trim();
      const isInsert = /^insert\s+into/i.test(text) && !/returning/i.test(text);
      if (isInsert) text += ' RETURNING id';
      const r = await query(text, params);
      return {
        lastID: isInsert ? r.rows[0]?.id : undefined,
        changes: r.rowCount,
      };
    },
    async exec(sql) {
      await getPool().query(sql);
    },
  };
}

// Crea el schema y las tablas si no existen (idempotente). El schema completo
// también vive en database/schema.sql para correrlo a mano en Supabase.
export async function initDb() {
  const db = await openDb();

  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS ${SCHEMA};

    CREATE TABLE IF NOT EXISTS ${SCHEMA}.users (
      id                   SERIAL PRIMARY KEY,
      firstName            TEXT    NOT NULL,
      lastName             TEXT    NOT NULL,
      phone                TEXT,
      email                TEXT    UNIQUE NOT NULL,
      username             TEXT    UNIQUE NOT NULL,
      password             TEXT    NOT NULL,
      role                 TEXT    NOT NULL CHECK (role IN ('patient', 'professional')),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      foto                 TEXT,
      dni                  TEXT,
      fecha_nacimiento     DATE,
      cobertura_medica     TEXT,
      numero_afiliado      TEXT,
      qr_token             TEXT,
      qr_token_expires     TIMESTAMPTZ,
      reset_token          TEXT,
      reset_token_expires  TIMESTAMPTZ,
      google_id            TEXT,
      terms_accepted       BOOLEAN DEFAULT FALSE,
      terms_accepted_at    TIMESTAMPTZ,
      banned_at            TIMESTAMPTZ,
      banned_by            INTEGER,
      ban_reason           TEXT
    );

    CREATE TABLE IF NOT EXISTS ${SCHEMA}.medical_records (
      id                       SERIAL PRIMARY KEY,
      patient_id               INTEGER NOT NULL REFERENCES ${SCHEMA}.users(id),
      tipo                     TEXT NOT NULL,
      titulo                   TEXT NOT NULL,
      descripcion              TEXT,
      fecha_registro           DATE,
      activo                   INTEGER DEFAULT 1,
      created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
      subtipo                  TEXT,
      profesional_nombre       TEXT,
      profesional_matricula    TEXT,
      profesional_institucion  TEXT,
      adjunto_base64           TEXT,
      adjunto_nombre           TEXT,
      professional_id          INTEGER
    );
  `);

  return db;
}
