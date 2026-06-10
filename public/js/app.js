const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : '';

// ─── Referencias DOM ──────────────────────────────────────────────────────────
const loginForm        = document.getElementById('loginForm');
const registerForm     = document.getElementById('registerForm');
const forgotForm       = document.getElementById('forgotForm');
const loginSection     = document.getElementById('loginSection');
const registerSection  = document.getElementById('registerSection');
const forgotSection    = document.getElementById('forgotSection');
const messageDiv       = document.getElementById('message');
const messageRegDiv    = document.getElementById('messageReg');
const messageForgotDiv = document.getElementById('messageForgot');

// ─── Utilidades ───────────────────────────────────────────────────────────────
function showMessage(msg, isError = true, registro = false) {
  const div = registro ? messageRegDiv : messageDiv;
  if (!div) return;
  div.textContent = msg;
  div.className = isError ? 'error' : 'exito';
}

function limpiarMensajes() {
  if (messageDiv)       { messageDiv.textContent = '';       messageDiv.className = ''; }
  if (messageRegDiv)    { messageRegDiv.textContent = '';    messageRegDiv.className = ''; }
  if (messageForgotDiv) { messageForgotDiv.textContent = ''; messageForgotDiv.className = ''; }
  const errPass = document.getElementById('error-passwordReg');
  if (errPass) errPass.textContent = '';
}

// ─── Limpiar error de contraseña al escribir ──────────────────────────────────
document.getElementById('passwordReg')?.addEventListener('input', () => {
  const errEl = document.getElementById('error-passwordReg');
  if (errEl) errEl.textContent = '';
});

// ─── Toggle mostrar/ocultar contraseña ────────────────────────────────────────
document.querySelectorAll('.toggle-pass').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.querySelector('.icon-eye').classList.toggle('hidden', show);
    btn.querySelector('.icon-eye-off').classList.toggle('hidden', !show);
  });
});

// ─── Alternar formularios ─────────────────────────────────────────────────────
document.getElementById('showRegisterBtn')?.addEventListener('click', () => {
  loginSection.classList.add('hidden');
  registerSection.classList.remove('hidden');
  limpiarMensajes();
});

document.getElementById('showLoginBtn')?.addEventListener('click', () => {
  registerSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  limpiarMensajes();
});

document.getElementById('showForgotBtn')?.addEventListener('click', () => {
  loginSection.classList.add('hidden');
  forgotSection.classList.remove('hidden');
  limpiarMensajes();
});

document.getElementById('showLoginFromForgot')?.addEventListener('click', () => {
  forgotSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
  limpiarMensajes();
});

// ─── Validaciones ─────────────────────────────────────────────────────────────
const nameRegex     = /^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/;
const phoneRegex    = /^\+?[\d\s\-]{6,20}$/;
const usernameRegex = /^[A-Za-z0-9_]+$/;
const emailRegex    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]).{8,16}$/;

// ─── Registro ─────────────────────────────────────────────────────────────────
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarMensajes();

  const firstName       = document.getElementById('firstNameReg').value.trim();
  const lastName        = document.getElementById('lastNameReg').value.trim();
  const phone           = document.getElementById('phoneReg').value.trim();
  const email           = document.getElementById('emailReg').value.trim();
  const username        = document.getElementById('usernameReg').value.trim();
  const password        = document.getElementById('passwordReg').value;
  const confirmPassword = document.getElementById('confirmPasswordReg').value;
  const role            = 'patient';

  if (!firstName || !lastName || !phone || !email || !username || !password || !confirmPassword) {
    showMessage('Por favor completá todos los campos.', true, true);
    return;
  }
  if (!nameRegex.test(firstName)) {
    showMessage('El nombre solo puede contener letras y espacios.', true, true);
    return;
  }
  if (!nameRegex.test(lastName)) {
    showMessage('El apellido solo puede contener letras y espacios.', true, true);
    return;
  }
  if (!phoneRegex.test(phone)) {
    showMessage('Teléfono inválido.', true, true);
    return;
  }
  if (!emailRegex.test(email)) {
    showMessage('El email no es válido.', true, true);
    return;
  }
  if (!usernameRegex.test(username)) {
    showMessage('El usuario solo puede tener letras, números y guión bajo.', true, true);
    return;
  }
  if (!passwordRegex.test(password)) {
    const errEl = document.getElementById('error-passwordReg');
    if (errEl) errEl.textContent = 'Mínimo 8 caracteres, una mayúscula, un número y un símbolo.';
    return;
  }
  if (password !== confirmPassword) {
    showMessage('Las contraseñas no coinciden.', true, true);
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, phone, email, username, password, role })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Error en el registro.', true, true);
      return;
    }

    showMessage('¡Cuenta creada! Ahora iniciá sesión.', false, true);
    registerForm.reset();
    setTimeout(() => {
      registerSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
      limpiarMensajes();
    }, 1500);

  } catch (error) {
    showMessage('Error conectando con el servidor.', true, true);
  }
});

// ─── Login con Google (callback) ──────────────────────────────────────────────
(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const error = params.get('error');

  if (error) {
    history.replaceState(null, '', '/');
    window.addEventListener('DOMContentLoaded', () => {
      showMessage('Error al iniciar sesión con Google. Intentá de nuevo.');
    });
    return;
  }

  if (!token) return;

  const payload = JSON.parse(atob(token.split('.')[1]));

  sessionStorage.setItem('token',    token);
  sessionStorage.setItem('userId',   payload.id);
  sessionStorage.setItem('role',     payload.role);
  sessionStorage.setItem('username', payload.username);
  sessionStorage.setItem('nombre',   `${payload.firstName} ${payload.lastName}`);

  window.location.replace('/pages/paciente.html');
})();

// ─── Login ────────────────────────────────────────────────────────────────────
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarMensajes();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showMessage('Ingresá usuario y contraseña.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Error en el login.');
      return;
    }

    const payload = JSON.parse(atob(data.token.split('.')[1]));

    sessionStorage.setItem('token',    data.token);
    sessionStorage.setItem('userId',   payload.id);
    sessionStorage.setItem('role',     payload.role);
    sessionStorage.setItem('username', payload.username);
    sessionStorage.setItem('nombre',   `${payload.firstName} ${payload.lastName}`);

    window.location.href = '/pages/paciente.html';

  } catch (error) {
    showMessage('Error conectando con el servidor.');
  }
});

// ─── Recuperar contraseña ─────────────────────────────────────────────────────
forgotForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('forgotEmail').value.trim();

  if (!emailRegex.test(email)) {
    messageForgotDiv.textContent = 'Ingresá un email válido.';
    messageForgotDiv.className = 'error';
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    messageForgotDiv.textContent = data.message;
    messageForgotDiv.className = res.ok ? 'exito' : 'error';
  } catch {
    messageForgotDiv.textContent = 'Error conectando con el servidor.';
    messageForgotDiv.className = 'error';
  }
});
