const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : '';

const params     = new URLSearchParams(window.location.search);
const token      = params.get('token');
const resetForm  = document.getElementById('resetForm');
const messageDiv = document.getElementById('messageReset');

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=\[\]{};:'",.<>/?\\|`~]).{8,16}$/;

function showMessage(msg, isError = true) {
  messageDiv.textContent = msg;
  messageDiv.className = isError ? 'error' : 'exito';
}

// Toggle mostrar/ocultar contraseña
document.querySelectorAll('.toggle-pass').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.querySelector('.icon-eye').classList.toggle('hidden', show);
    btn.querySelector('.icon-eye-off').classList.toggle('hidden', !show);
  });
});

if (!token) {
  showMessage('Link inválido o expirado. Solicitá uno nuevo desde el inicio de sesión.');
  resetForm.style.display = 'none';
}

resetForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('newPassword').value;
  const confirm  = document.getElementById('confirmNewPassword').value;

  if (!passwordRegex.test(password)) {
    showMessage('La contraseña debe tener 8-16 caracteres, una mayúscula, un número y un símbolo.');
    return;
  }
  if (password !== confirm) {
    showMessage('Las contraseñas no coinciden.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.message || 'Error al cambiar la contraseña.');
      return;
    }

    showMessage(data.message, false);
    resetForm.style.display = 'none';
    setTimeout(() => { window.location.href = '/'; }, 2000);

  } catch {
    showMessage('Error conectando con el servidor.');
  }
});
