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

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

// Middleware para validar token JWT
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

let db;

initDb()
  .then(database => {
    db = database;
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error inicializando la base de datos:', err);
  });

// Registro de usuario
app.post('/register', async (req, res) => {
  const { firstName, lastName, phone, email, username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Faltan datos obligatorios' });
  }

  try {
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

  try {
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
      { expiresIn: '1h' }
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
