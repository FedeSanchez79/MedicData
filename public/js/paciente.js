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
  setTimeout(() => { el.className = ''; el.style.display = 'none'; }, 3500);
}

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('btn-logout').addEventListener('click', () => {
  sessionStorage.clear();
  window.location.href = '/';
});

// ── Cargar datos del paciente ─────────────────────────────────────────────────
async function cargarDatosPaciente() {
  try {
    const res = await fetch(`${API_BASE_URL}/historial/paciente/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Error al cargar datos');
    const data = await res.json();

    const p = data.paciente;
    document.getElementById('datos-personales').innerHTML = `
      <div class="dato-row"><span class="dato-label">Nombre</span><span class="dato-valor">${p.firstName} ${p.lastName}</span></div>
      <div class="dato-row"><span class="dato-label">Email</span><span class="dato-valor">${p.email}</span></div>
      <div class="dato-row"><span class="dato-label">Teléfono</span><span class="dato-valor">${p.phone || '—'}</span></div>
    `;

    renderHistorial(data.historial);

  } catch (err) {
    document.getElementById('datos-personales').innerHTML = '<p style="color:#DC2626;font-size:.85rem">Error cargando datos</p>';
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
        <span class="tipo-badge tipo-${item.tipo}">${tipoLabels[item.tipo] || item.tipo}</span>
        <div class="historial-item-body">
          <div class="historial-item-titulo">${item.titulo}</div>
          ${item.descripcion ? `<div class="historial-item-desc">${item.descripcion}</div>` : ''}
          ${item.fecha_registro ? `<div class="historial-item-meta">Fecha: ${item.fecha_registro}</div>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ── Iniciar ───────────────────────────────────────────────────────────────────
cargarDatosPaciente();
