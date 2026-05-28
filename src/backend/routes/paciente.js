import express from 'express';
import nodemailer from 'nodemailer';
import { openDb } from '../database.js';

const router = express.Router();

let mailer = null;
if (process.env.MAIL_HOST) {
  mailer = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });
}

async function notifyPatient(to, patientName, profesionalNombre, tipo) {
  if (!mailer) {
    console.log(`[DEV] Email a ${to}: nuevo registro médico cargado por ${profesionalNombre} (${tipo})`);
    return;
  }
  await mailer.sendMail({
    from: process.env.MAIL_FROM || '"Medic Data" <noreply@medicdata.com>',
    to,
    subject: 'Nuevo registro médico cargado — Medic Data',
    html: `<p>Hola ${patientName},</p><p>El profesional <strong>${profesionalNombre}</strong> cargó un nuevo registro médico de tipo <strong>${tipo}</strong> en tu historial de Medic Data.</p><p>Podés consultarlo en tu perfil en cualquier momento.</p>`,
  });
}

// GET /historial/paciente/:id — solo el propio paciente puede ver su historial
router.get('/:id', async (req, res) => {
  const { role, id: userId } = req.user;

  if (role !== 'patient') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }

  if (userId !== parseInt(req.params.id)) {
    return res.status(403).json({ message: 'Solo podés ver tu propio historial' });
  }

  try {
    const db = await openDb();

    const paciente = await db.get(
      `SELECT id, firstName, lastName, email, phone, foto, dni, fecha_nacimiento, cobertura_medica, numero_afiliado FROM users WHERE id = ? AND role = 'patient'`,
      req.params.id
    );

    if (!paciente) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    const historial = await db.all(
      `SELECT * FROM medical_records WHERE patient_id = ? ORDER BY created_at DESC`,
      req.params.id
    );

    res.json({ paciente, historial });

  } catch (err) {
    console.error('Error en GET /historial/paciente/:id :', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /historial/paciente/cargar — solo profesionales pueden cargar registros
router.post('/cargar', async (req, res) => {
  if (req.user.role !== 'professional') {
    return res.status(403).json({ message: 'Solo profesionales pueden cargar registros médicos' });
  }

  const {
    patient_id,
    tipo,
    subtipo,
    descripcion,
    fecha,
    profesional_nombre,
    profesional_matricula,
    profesional_institucion,
    adjunto_base64,
    adjunto_nombre,
  } = req.body;

  if (!patient_id) {
    return res.status(400).json({ message: 'patient_id es requerido' });
  }
  if (!tipo) {
    return res.status(400).json({ message: 'tipo es requerido' });
  }

  try {
    const db = await openDb();

    const patient = await db.get(
      `SELECT id, firstName, lastName, email FROM users WHERE id = ? AND role = 'patient'`,
      patient_id
    );
    if (!patient) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    const result = await db.run(
      `INSERT INTO medical_records
        (patient_id, tipo, titulo, subtipo, descripcion, fecha_registro,
         profesional_nombre, profesional_matricula, profesional_institucion,
         adjunto_base64, adjunto_nombre, professional_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient_id, tipo, tipo,
        subtipo || null, descripcion || null, fecha || null,
        profesional_nombre || null, profesional_matricula || null, profesional_institucion || null,
        adjunto_base64 || null, adjunto_nombre || null,
        req.user.id,
      ]
    );

    const record = await db.get(`SELECT * FROM medical_records WHERE id = ?`, result.lastID);

    await notifyPatient(
      patient.email,
      patient.firstName,
      profesional_nombre || 'el profesional',
      tipo
    );

    res.status(201).json(record);
  } catch (err) {
    console.error('Error en POST /historial/paciente/cargar:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

export default router;
