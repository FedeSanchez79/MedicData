import express from 'express';
import { openDb } from '../database.js';

const router = express.Router();

// GET /historial/paciente/:id
// Paciente: solo el propio. Profesional: cualquiera.
router.get('/:id', async (req, res) => {
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
      `SELECT mr.*, u.firstName as prof_nombre, u.lastName as prof_apellido
       FROM medical_records mr
       JOIN users u ON u.id = mr.professional_id
       WHERE mr.patient_id = ?
       ORDER BY mr.created_at DESC`,
      req.params.id
    );

    res.json({ paciente, historial });

  } catch (err) {
    console.error('Error en GET /historial/paciente/:id :', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /historial/paciente/:id/registro
// Solo profesionales pueden cargar registros
router.post('/:id/registro', async (req, res) => {
  const { role, id: profId } = req.user;

  if (role !== 'professional') {
    return res.status(403).json({ message: 'Solo profesionales pueden cargar registros' });
  }

  const { tipo, titulo, descripcion, fecha_registro } = req.body;

  if (!tipo || !titulo) {
    return res.status(400).json({ message: 'Tipo y título son obligatorios' });
  }

  const tiposValidos = ['diagnostico', 'medicacion', 'alergia', 'cirugia', 'vacuna', 'estudio', 'nota'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ message: 'Tipo de registro inválido' });
  }

  try {
    const db = await openDb();

    // Verificar que el paciente existe
    const paciente = await db.get(
      `SELECT id FROM users WHERE id = ? AND role = 'patient'`,
      req.params.id
    );

    if (!paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    // Insertar el registro
    await db.run(
      `INSERT INTO medical_records (patient_id, professional_id, tipo, titulo, descripcion, fecha_registro, acepta_paciente)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [req.params.id, profId, tipo, titulo, descripcion || null, fecha_registro || null]
    );

    // Registrar en el log de auditoría
    await db.run(
      `INSERT INTO access_log (patient_id, accessed_by, metodo) VALUES (?, ?, 'directo')`,
      [req.params.id, profId]
    );

    // Devolver el historial actualizado
    const historial = await db.all(
      `SELECT mr.*, u.firstName as prof_nombre, u.lastName as prof_apellido
       FROM medical_records mr
       JOIN users u ON u.id = mr.professional_id
       WHERE mr.patient_id = ?
       ORDER BY mr.created_at DESC`,
      req.params.id
    );

    res.status(201).json({ message: 'Registro guardado', historial });

  } catch (err) {
    console.error('Error en POST /historial/paciente/:id/registro :', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
