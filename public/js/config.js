// Configuración base para URL del backend según entorno

const hostname = window.location.hostname;

let BACKEND_URL;

if (hostname === 'localhost' || hostname === '127.0.0.1') {
  BACKEND_URL = 'http://localhost:3000';
} else {
  BACKEND_URL = 'https://tu-backend-produccion.com'; // Cambiá esto por la URL real de tu backend en producción
}

window.BACKEND_URL = BACKEND_URL;
