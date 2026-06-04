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
document.getElementById('nombre-display').textContent = nombre || 'Paciente';

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

// ── Registros ─────────────────────────────────────────────────────────────────
let todosRegistros = [];

// ── Adjuntos ──────────────────────────────────────────────────────────────────
const adjuntosMap = {};
const IMG_EXTS = new Set(['png','jpg','jpeg','gif','webp','bmp']);
const MIME_MAP = { pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', bmp:'image/bmp' };

function descargarAdjunto(idx) {
  const { base64, nombre } = adjuntosMap[idx];
  let dataStr = base64, mime = 'application/octet-stream';
  if (dataStr.startsWith('data:')) {
    const m = dataStr.match(/^data:([^;]+);base64,(.+)$/);
    if (m) { mime = m[1]; dataStr = m[2]; }
  } else {
    const ext = nombre.split('.').pop().toLowerCase();
    mime = MIME_MAP[ext] || mime;
  }
  const bytes = atob(dataStr);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([arr], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Labels de tipo ────────────────────────────────────────────────────────────
const tipoLabels = {
  consulta:    'Consulta médica',
  estudio:     'Estudio médico',
  practica:    'Práctica médica',
  diagnostico: 'Diagnóstico',
  medicacion:  'Medicación',
  alergia:     'Alergia',
  cirugia:     'Cirugía',
  vacuna:      'Vacuna',
  nota:        'Nota'
};

function formatFechaES(str) {
  if (!str) return '—';
  const d = new Date(str.replace(' ', 'T'));
  if (isNaN(d.getTime())) return String(str);
  return d.toLocaleString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Renderizar historial ──────────────────────────────────────────────────────
function renderHistorial(historial) {
  const container = document.getElementById('historial-container');
  const badge     = document.getElementById('badge-count');

  Object.keys(adjuntosMap).forEach(k => delete adjuntosMap[k]);
  badge.textContent = `${historial.length} registro${historial.length !== 1 ? 's' : ''}`;

  if (!historial.length) {
    if (todosRegistros.length > 0) {
      container.innerHTML = `
        <div class="historial-sin-filtros">
          <p>No se encontraron registros con esos filtros.</p>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="historial-vacio">
          <p>📋</p>
          <p>No hay registros médicos todavía.</p>
        </div>`;
    }
    return;
  }

  container.innerHTML = `<div class="historial-lista">
    ${historial.map((item, idx) => {
      const label = tipoLabels[item.tipo] || esc(item.tipo);
      const titulo = item.subtipo ? esc(item.subtipo) : label;
      const profParts = [
        item.profesional_nombre,
        item.profesional_matricula ? 'Mat. ' + item.profesional_matricula : null,
        item.profesional_institucion
      ].filter(Boolean).map(p => esc(p));

      let adjuntoHtml = '';
      if (item.adjunto_base64 && item.adjunto_nombre) {
        adjuntosMap[idx] = { base64: item.adjunto_base64, nombre: item.adjunto_nombre };
        const ext = item.adjunto_nombre.split('.').pop().toLowerCase();
        const isImage = IMG_EXTS.has(ext);
        const thumbHtml = isImage
          ? `<img class="adjunto-thumb" src="${
              item.adjunto_base64.startsWith('data:')
                ? item.adjunto_base64
                : `data:image/${ext};base64,${item.adjunto_base64}`
            }" alt="${esc(item.adjunto_nombre)}">`
          : '';
        adjuntoHtml = `
          <div class="adjunto-area">
            ${thumbHtml}
            <button class="btn-adjunto" onclick="descargarAdjunto(${idx})">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              ${esc(item.adjunto_nombre)}
            </button>
          </div>`;
      }

      return `
        <div class="historial-item historial-item-${esc(item.tipo)}">
          <div class="historial-item-body">
            <span class="tipo-badge tipo-${esc(item.tipo)}">${label}</span>
            <div class="historial-item-titulo">${titulo}</div>
            ${item.descripcion ? `<div class="historial-item-desc">${esc(item.descripcion)}</div>` : ''}
            ${profParts.length ? `<div class="historial-item-prof">${profParts.join(' — ')}</div>` : ''}
            <div class="historial-item-meta">${formatFechaES(item.created_at || item.fecha_registro)}</div>
            ${adjuntoHtml}
          </div>
        </div>`;
    }).join('')}
  </div>`;
}

// ── Aplicar filtros ───────────────────────────────────────────────────────────
function aplicarFiltros() {
  const texto = document.getElementById('filtro-texto').value.trim().toLowerCase();
  const tipo  = document.getElementById('filtro-tipo').value;
  const desde = document.getElementById('filtro-desde').value;
  const hasta = document.getElementById('filtro-hasta').value;

  const filtrados = todosRegistros.filter(item => {
    if (texto) {
      const enDesc = (item.descripcion || '').toLowerCase().includes(texto);
      const enProf = (item.profesional_nombre || '').toLowerCase().includes(texto);
      const enInst = (item.profesional_institucion || '').toLowerCase().includes(texto);
      if (!enDesc && !enProf && !enInst) return false;
    }

    if (tipo && item.tipo !== tipo) return false;

    const fechaItem = (item.created_at || item.fecha_registro || '').substring(0, 10);
    if (desde && fechaItem && fechaItem < desde) return false;
    if (hasta && fechaItem && fechaItem > hasta) return false;

    return true;
  });

  renderHistorial(filtrados);
}

// ── Listeners de filtros ──────────────────────────────────────────────────────
document.getElementById('filtro-texto').addEventListener('input', aplicarFiltros);
document.getElementById('filtro-tipo').addEventListener('change', aplicarFiltros);
document.getElementById('filtro-desde').addEventListener('change', aplicarFiltros);
document.getElementById('filtro-hasta').addEventListener('change', aplicarFiltros);

document.getElementById('btn-limpiar-filtros').addEventListener('click', () => {
  document.getElementById('filtro-texto').value = '';
  document.getElementById('filtro-tipo').value  = '';
  document.getElementById('filtro-desde').value = '';
  document.getElementById('filtro-hasta').value = '';
  aplicarFiltros();
});

// ── Cargar historial ──────────────────────────────────────────────────────────
async function cargarHistorial() {
  try {
    const res = await fetch(`${API_BASE_URL}/historial/paciente/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    todosRegistros = (data.historial || []).sort((a, b) => {
      const da = new Date((a.created_at || a.fecha_registro || '').replace(' ', 'T'));
      const db = new Date((b.created_at || b.fecha_registro || '').replace(' ', 'T'));
      return db - da;
    });

    aplicarFiltros();
  } catch {
    document.getElementById('historial-container').innerHTML = '';
    toast('Error cargando el historial', 'error');
  }
}

// ── Tarjeta del paciente ──────────────────────────────────────────────────────
async function cargarTarjetaPaciente() {
  const nombreEl    = document.getElementById('paciente-nombre-card');
  const inicialesEl = document.getElementById('paciente-iniciales');
  const avatarEl    = document.getElementById('paciente-avatar-el');

  if (nombre) {
    nombreEl.textContent = nombre;
    const partes = nombre.trim().split(/\s+/);
    const ini = (partes[0]?.[0] || '') + (partes.length > 1 ? (partes[partes.length - 1]?.[0] || '') : '');
    inicialesEl.textContent = ini.toUpperCase() || '—';
  }

  try {
    const res = await fetch(`${API_BASE_URL}/perfil/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const perfil = await res.json();

    if (perfil.email) {
      document.getElementById('paciente-email-card').textContent = perfil.email;
    }
    if (perfil.foto) {
      avatarEl.innerHTML = `<img src="${perfil.foto}" alt="Foto de perfil">`;
    } else {
      const ini = `${perfil.firstName?.[0] || ''}${perfil.lastName?.[0] || ''}`.toUpperCase();
      if (ini) inicialesEl.textContent = ini;
    }
  } catch {
    // No es crítico: la tarjeta ya muestra el nombre del sessionStorage
  }
}

// ── QR ────────────────────────────────────────────────────────────────────────
let qrCountdownInterval = null;

document.getElementById('btn-generar-qr').addEventListener('click', async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/api/qr/generar`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    const canvas = document.getElementById('qr-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
    };
    img.src = data.qr_image;

    document.getElementById('qr-display').style.display = '';

    if (qrCountdownInterval) clearInterval(qrCountdownInterval);
    let secondsLeft = 15 * 60;

    function updateTimer() {
      const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
      const secs = (secondsLeft % 60).toString().padStart(2, '0');
      document.getElementById('qr-timer').textContent = `${mins}:${secs}`;
      if (secondsLeft <= 0) {
        clearInterval(qrCountdownInterval);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('qr-display').style.display = 'none';
        toast('El QR expiró. Generá uno nuevo.', 'error');
        return;
      }
      secondsLeft--;
    }

    updateTimer();
    qrCountdownInterval = setInterval(updateTimer, 1000);

  } catch {
    toast('Error generando el QR', 'error');
  }
});

// ── Iniciar ───────────────────────────────────────────────────────────────────
cargarHistorial();
cargarTarjetaPaciente();
