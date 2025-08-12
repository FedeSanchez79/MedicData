import express from 'express';
import { authenticateToken } from './middlewares/authMiddleware.js'; // tu middleware JWT
import { openDb } from '../database.js';

const app = express();
let db;

openDb().then(database => {
  db = database;
  app.listen(3000, () => console.log('Backend escuchando en http://localhost:3000'));
});

app.get('/historial/paciente/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient' && req.user.role !== 'professional') {
    return res.status(403).send('<h1>Acceso denegado</h1>');
  }

  // Si es paciente, solo puede ver su propio historial
  if (req.user.role === 'patient' && req.user.id !== parseInt(req.params.id)) {
    return res.status(403).send('<h1>Acceso denegado</h1>');
  }

  try {
    const paciente = await db.get(
      'SELECT username AS nombre FROM users WHERE id = ?',
      req.params.id
    );
    if (!paciente) return res.status(404).send('<h1>Historial no encontrado</h1>');

    const data = await db.get(
      'SELECT data, last_modified FROM medical_data WHERE user_id = ?',
      req.params.id
    );

    res.send(`
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Historial Médico - ${paciente.nombre}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 2rem; }
            h1 { color: #333; }
            p { font-size: 1.1rem; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Historial Médico</h1>
          <p><span class="label">Nombre:</span> ${paciente.nombre}</p>
          <p><span class="label">Datos médicos:</span> ${data ? data.data : 'No hay datos médicos guardados'}</p>
          <p><span class="label">Última modificación:</span> ${data ? data.last_modified : '---'}</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(err);
    res.status(500).send('<h1>Error en el servidor</h1>');
  }
});
