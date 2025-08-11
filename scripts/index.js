import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { openDb, initDb } from './database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret_key';

app.use(cors());
app.use(express.json());

let db;

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

initDb().then(database => {
  db = database;
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});

app.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role)
    return res.status(400).json({ message: 'Faltan datos' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );
    res.status(201).json({ message: 'Usuario registrado' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ message: 'Usuario ya existe' });
    } else {
      res.status(500).json({ message: 'Error en el servidor' });
    }
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token });
  } catch {
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

app.get('/patient-data', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient')
    return res.status(403).json({ message: 'Acceso denegado' });

  try {
    const user = await db.get('SELECT id FROM users WHERE username = ?', req.user.username);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const data = await db.get('SELECT data, last_modified FROM medical_data WHERE user_id = ?', user.id);

    res.json(data || { data: 'No hay datos médicos guardados' });
  } catch {
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

app.post('/medical-data/:username', authenticateToken, async (req, res) => {
  if (req.user.role !== 'professional')
    return res.status(403).json({ message: 'Acceso denegado' });

  const { username } = req.params;
  const { data } = req.body;

  try {
    const user = await db.get('SELECT id FROM users WHERE username = ?', username);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const existing = await db.get('SELECT id FROM medical_data WHERE user_id = ?', user.id);

    if (existing) {
      await db.run('UPDATE medical_data SET data = ?, last_modified = CURRENT_TIMESTAMP WHERE user_id = ?', data, user.id);
    } else {
      await db.run('INSERT INTO medical_data (user_id, data) VALUES (?, ?)', user.id, data);
    }

    res.json({ message: 'Datos médicos actualizados' });
  } catch {
    res.status(500).json({ message: 'Error en el servidor' });
  }
});
