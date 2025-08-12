// Referencias DOM
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const showRegisterBtnInline = document.getElementById('showRegisterBtnInline');
const showLoginBtn = document.getElementById('showLoginBtn');
const messageDiv = document.getElementById('message');

// Expresiones regulares para validación
const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
const phoneRegex = /^\d+$/;
const usernameRegex = /^[A-Za-z0-9]+$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>\/?\\|`~]).{8,16}$/;

// Función para mostrar mensaje
function showMessage(msg, isError = true) {
  messageDiv.textContent = msg;
  messageDiv.style.color = isError ? '#dc3545' : '#28a745';
}

// Mostrar formulario registro con animación
function showRegister() {
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  messageDiv.textContent = '';
}

// Mostrar formulario login con animación
function showLogin() {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  messageDiv.textContent = '';
}

// Event listeners para alternar formularios
showRegisterBtnInline.addEventListener('click', showRegister);
showLoginBtn.addEventListener('click', showLogin);

// Registro
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageDiv.textContent = '';

  const firstName = document.getElementById('firstNameReg').value.trim();
  const lastName = document.getElementById('lastNameReg').value.trim();
  const phone = document.getElementById('phoneReg').value.trim();
  const email = document.getElementById('emailReg').value.trim();
  const regUsername = document.getElementById('usernameReg').value.trim();
  const regPassword = document.getElementById('passwordReg').value;
  const confirmPassword = document.getElementById('confirmPasswordReg').value;
  const regRole = document.getElementById('roleReg').value;

  if (!firstName || !lastName || !phone || !email || !regUsername || !regPassword || !confirmPassword || !regRole) {
    showMessage('Por favor completa todos los campos.');
    return;
  }

  if (!nameRegex.test(firstName)) {
    showMessage('El nombre solo puede contener letras y espacios.');
    return;
  }
  if (!nameRegex.test(lastName)) {
    showMessage('El apellido solo puede contener letras y espacios.');
    return;
  }
  if (!phoneRegex.test(phone)) {
    showMessage('El teléfono solo puede contener números.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage('El correo electrónico no es válido.');
    return;
  }

  if (!usernameRegex.test(regUsername)) {
    showMessage('El usuario solo puede contener letras y números, sin espacios.');
    return;
  }

  if (!passwordRegex.test(regPassword)) {
    showMessage('La contraseña debe tener 8-16 caracteres, al menos una mayúscula, un número y un símbolo.');
    return;
  }

  if (regPassword !== confirmPassword) {
    showMessage('Las contraseñas no coinciden.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        email,
        username: regUsername,
        password: regPassword,
        role: regRole
      })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Error en el registro.');
      return;
    }

    showMessage('Registro exitoso! Ahora logueate.', false);
    registerForm.reset();
    showLogin();

  } catch (error) {
    showMessage('Error conectando con el servidor.');
  }
});

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageDiv.textContent = '';

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username || !password) {
    showMessage('Por favor ingresa usuario y contraseña.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Error en el login.');
      return;
    }

    showMessage('Login exitoso!', false);
    loginForm.reset();

    // Guardar token y datos decodificados en sessionStorage
    const payload = JSON.parse(atob(data.token.split('.')[1]));
    const pacienteId = payload.id || payload.userId || null; // según backend
    const role = payload.role;
    const usernameToken = payload.username;

    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('pacienteId', pacienteId);
    sessionStorage.setItem('pacienteNombre', usernameToken);
    sessionStorage.setItem('role', role);

    // Redirigir o cargar panel paciente
    if (role === 'patient') {
      window.location.href = '/pages/paciente.html';
    } else {
      window.location.href = '/'; 
    }


  } catch (error) {
    showMessage('Error conectando con el servidor.');
  }
});
