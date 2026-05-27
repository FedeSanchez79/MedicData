import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import { openDb, initDb } from './database.js';
import pacienteRouter from './routes/paciente.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

// ─── Email ────────────────────────────────────────────────────────────────────
let transporter = null;
if (process.env.MAIL_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
} else {
  console.warn('[Email] MAIL_HOST no configurado. Los links de recuperación se imprimirán en consola.');
}

async function sendResetEmail(to, firstName, resetUrl) {
  if (!transporter) {
    console.log(`[DEV] Reset link para ${to}:\n${resetUrl}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || '"Medic Data" <noreply@medicdata.com>',
    to,
    subject: { encoding: 'utf-8', data: 'Recuperar contraseña — Medic Data' },
    html: { encoding: 'utf-8', data: `<p>Hola ${firstName},</p><p>Recibimos una solicitud para resetear tu contraseña de Medic Data.</p><p><a href="${resetUrl}">Hacé clic aquí para crear una nueva contraseña</a></p><p>Este link expira en 1 hora. Si no solicitaste este cambio, ignorá este email.</p>` },
    charset: 'utf-8',
  });
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ─── Middleware JWT ───────────────────────────────────────────────────────────
// Se exporta para que los routers lo puedan usar
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

// ─── Rutas públicas ───────────────────────────────────────────────────────────

// Registro de usuario
app.post('/register', async (req, res) => {
  const { firstName, lastName, phone, email, username, password, role } = req.body;

  if (!firstName || !lastName || !email || !username || !password || !role) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  if (role !== 'patient') {
    return res.status(400).json({ message: 'Rol inválido' });
  }

  try {
    const db = await openDb();
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.run(
      `INSERT INTO users (firstName, lastName, phone, email, username, password, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, phone, email, username, hashedPassword, role]
    );

    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    console.error('Error en /register:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ message: 'El usuario o email ya existe' });
    } else {
      res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
});

// Login de usuario
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
  }

  try {
    const db = await openDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);

    if (!user) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });
  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener perfil del paciente
app.get('/perfil/:id', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  if (userId !== parseInt(req.params.id)) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  try {
    const db = await openDb();
    const paciente = await db.get(
      `SELECT id, firstName, lastName, email, phone, foto, dni, fecha_nacimiento, cobertura_medica, numero_afiliado FROM users WHERE id = ? AND role = 'patient'`,
      req.params.id
    );
    if (!paciente) return res.status(404).json({ message: 'Paciente no encontrado' });
    res.json(paciente);
  } catch (err) {
    console.error('Error en GET /perfil:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar perfil del paciente
app.put('/perfil/:id', authenticateToken, async (req, res) => {
  const { id: userId } = req.user;
  if (userId !== parseInt(req.params.id)) {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  const { foto, dni, fecha_nacimiento, cobertura_medica, numero_afiliado, phone } = req.body;

  if (foto && foto.length > 2_000_000) {
    return res.status(400).json({ message: 'La imagen es demasiado grande. Máximo 1.5MB.' });
  }

  try {
    const db = await openDb();
    await db.run(
      `UPDATE users SET foto=?, dni=?, fecha_nacimiento=?, cobertura_medica=?, numero_afiliado=?, phone=? WHERE id=?`,
      [foto ?? null, dni || null, fecha_nacimiento || null, cobertura_medica || null, numero_afiliado || null, phone || null, userId]
    );
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (err) {
    console.error('Error en PUT /perfil:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Solicitar reset de contraseña
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email requerido' });

  try {
    const db = await openDb();
    const user = await db.get('SELECT id, firstName, email FROM users WHERE email = ?', email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await db.run(
        'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
        [resetToken, expiresAt, user.id]
      );
      const resetUrl = `${PUBLIC_URL}/pages/reset-password.html?token=${resetToken}`;
      await sendResetEmail(user.email, user.firstName, resetUrl);
    }

    res.json({ message: 'Si el email está registrado, recibirás un link en breve.' });
  } catch (err) {
    console.error('Error en /forgot-password:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Resetear contraseña con token
app.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: 'Datos incompletos' });

  try {
    const db = await openDb();
    const user = await db.get(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?',
      [token, new Date().toISOString()]
    );

    if (!user) return res.status(400).json({ message: 'El link es inválido o ha expirado.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Contraseña actualizada correctamente.' });
  } catch (err) {
    console.error('Error en /reset-password:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ─── Rutas protegidas ─────────────────────────────────────────────────────────

// Generar QR token del paciente
app.get('/api/qr/generar', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const db = await openDb();
    const qrToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db.run(
      'UPDATE users SET qr_token = ?, qr_token_expires = ? WHERE id = ?',
      [qrToken, expiresAt, userId]
    );
    const qrUrl = `https://localhost:3001/pages/ver-paciente.html?token=${qrToken}`;
    const qrImage = await QRCode.toDataURL(qrUrl, { width: 220, margin: 2 });
    res.json({ token: qrToken, expires_at: expiresAt, qr_image: qrImage });
  } catch (err) {
    console.error('Error en GET /api/qr/generar:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Historial del paciente
app.use('/historial/paciente', authenticateToken, pacienteRouter);

// ─── Inicializar DB y arrancar servidor ───────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error inicializando la base de datos:', err);
    process.exit(1);
  });