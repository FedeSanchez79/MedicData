import express from 'express';
import { openDb } from '../database.js';

const router = express.Router();

// GET /historial/paciente/:id
// Acceso: paciente (solo el propio) o profesional (cualquiera)
router.get('/:id', async (req, res) => {
  // req.user viene del middleware authenticateToken aplicado en app.js
  const { role, id: userId } = req.user;

  if (role !== 'patient' && role !== 'professional') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  if (role === 'patient' && userId !== parseInt(req.params.id)) {
    return res.status(403).json({ message: 'Solo podés ver tu propio historial' });
  }

  try {
    const db = await openDb();

    const paciente = await db.get(
      `SELECT id, firstName, lastName, email, phone FROM users WHERE id = ? AND role = 'patient'`,
      req.params.id
    );

    if (!paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    const historial = await db.all(
      `SELECT * FROM medical_records WHERE patient_id = ? ORDER BY created_at DESC`,
      req.params.id
    );

    res.json({
      paciente,
      historial
    });

  } catch (err) {
    console.error('Error en GET /historial/paciente/:id :', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
