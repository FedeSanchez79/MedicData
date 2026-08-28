// Punto de entrada serverless para Vercel: reexporta la app de Express.
// Vercel envuelve este handler y le pasa cada request como una invocación
// aislada (no hay `app.listen` corriendo acá).
import app from '../src/backend/app.js';

export default app;
