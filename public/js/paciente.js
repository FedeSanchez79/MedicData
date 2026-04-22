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
        <p>Tu médico podrá cargar información después de escanear tu QR.</p>
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
          <div class="historial-item-titulo">
            ${item.titulo}
            ${item.acepta_paciente === 0 ? '<span class="pendiente-badge">Pendiente tu confirmación</span>' : ''}
          </div>
          ${item.descripcion ? `<div class="historial-item-desc">${item.descripcion}</div>` : ''}
          <div class="historial-item-meta">
            ${item.fecha_registro ? `Fecha: ${item.fecha_registro} · ` : ''}
            Cargado por: ${item.prof_nombre || '—'} ${item.prof_apellido || ''}
          </div>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ── Generar QR ────────────────────────────────────────────────────────────────
const QR_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>`;

let qrInterval = null;

document.getElementById('btn-generar-qr').addEventListener('click', async () => {
  const btn = document.getElementById('btn-generar-qr');
  btn.disabled = true;
  btn.textContent = 'Generando...';

  try {
    const res = await fetch(`${API_BASE_URL}/qr/generar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error();
    const data = await res.json();

    const canvas = document.getElementById('qr-canvas');
    await QRCode.toCanvas(canvas, data.url, {
      width: 180,
      margin: 1,
      color: { dark: '#111827', light: '#FFFFFF' }
    });

    document.getElementById('qr-wrapper').classList.add('visible');

    if (qrInterval) clearInterval(qrInterval);
    const expira = new Date(data.expires_at).getTime();

    function actualizarCountdown() {
      const resta = expira - Date.now();
      if (resta <= 0) {
        clearInterval(qrInterval);
        document.getElementById('qr-countdown').textContent = 'QR expirado. Generá uno nuevo.';
        document.getElementById('qr-wrapper').classList.remove('visible');
        btn.disabled = false;
        btn.innerHTML = `${QR_SVG} Generar código QR`;
        return;
      }
      const min = Math.floor(resta / 60000);
      const seg = Math.floor((resta % 60000) / 1000);
      document.getElementById('qr-countdown').textContent =
        `Expira en ${min}:${seg.toString().padStart(2, '0')}`;
    }

    const urlDiv = document.getElementById('qr-url');
    urlDiv.textContent = data.url;
    urlDiv.style.display = 'block';
    actualizarCountdown();
    qrInterval = setInterval(actualizarCountdown, 1000);

    toast('QR generado. Mostráselo al profesional.');

  } catch (err) {
    toast('Error generando el QR', 'error');
    btn.disabled = false;
    btn.innerHTML = `${QR_SVG} Generar código QR`;
  }
});

// ── Iniciar ───────────────────────────────────────────────────────────────────
cargarDatosPaciente();
