const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000' : '';

// ── Verificar sesión ──────────────────────────────────────────────────────────
const token  = sessionStorage.getItem('token');
const role   = sessionStorage.getItem('role');
const userId = sessionStorage.getItem('userId');
const nombre = sessionStorage.getItem('nombre');

if (!token || role !== 'patient') {
  window.location.href = '/';
}

// ── UI inicial ────────────────────────────────────────────────────────────────
document.getElementById('nombre-display').textContent    = nombre || 'Paciente';
document.getElementById('titulo-bienvenida').textContent = `Hola, ${nombre?.split(' ')[0] || 'Paciente'}`;

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, tipo = 'exito') {
  const el = document.getElementById('mensaje-global');
  el.textContent = msg;
  el.className = tipo;
  el.style.display = '';
  setTimeout(() => { el.className = ''; el.style.display = 'none'; }, 3500);
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = '/';
});

// ── Escape HTML ───────────────────────────────────────────────────────────────
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Cargar historial ──────────────────────────────────────────────────────────
async function cargarHistorial() {
  try {
    const res = await fetch(`${API_BASE_URL}/historial/paciente/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error();
    const data = await res.json();
    renderHistorial(data.historial);

  } catch {
    document.getElementById('historial-container').innerHTML = '';
    toast('Error cargando el historial', 'error');
  }
}

// ── Renderizar historial ──────────────────────────────────────────────────────
function renderHistorial(historial) {
  const container = document.getElementById('historial-container');
  const badge     = document.getElementById('badge-count');

  badge.textContent = `${historial.length} registro${historial.length !== 1 ? 's' : ''}`;

  if (!historial.length) {
    container.innerHTML = `
      <div class="historial-vacio">
        <p>📋</p>
        <p>No hay registros médicos todavía.</p>
      </div>`;
    return;
  }

  const tipoLabels = {
    diagnostico: 'Diagnóstico',
    medicacion:  'Medicación',
    alergia:     'Alergia',
    cirugia:     'Cirugía',
    vacuna:      'Vacuna',
    estudio:     'Estudio',
    nota:        'Nota'
  };

  container.innerHTML = `<div class="historial-lista">
    ${historial.map(item => `
      <div class="historial-item">
        <span class="tipo-badge tipo-${esc(item.tipo)}">${tipoLabels[item.tipo] || esc(item.tipo)}</span>
        <div class="historial-item-body">
          <div class="historial-item-titulo">${esc(item.titulo)}</div>
          ${item.descripcion ? `<div class="historial-item-desc">${esc(item.descripcion)}</div>` : ''}
          ${item.fecha_registro ? `<div class="historial-item-meta">Fecha: ${esc(item.fecha_registro)}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ── Iniciar ───────────────────────────────────────────────────────────────────
cargarHistorial();
