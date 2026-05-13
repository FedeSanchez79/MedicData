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

function formatFecha(f) {
  if (!f) return '—';
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}`;
}

// ── Estado del perfil ─────────────────────────────────────────────────────────
let perfilActual = null;
let nuevaFoto    = undefined;

// ── Renderizar avatar ─────────────────────────────────────────────────────────
function renderAvatar(el, p) {
  if (p?.foto) {
    el.innerHTML = `<img src="${p.foto}" alt="Foto de perfil">`;
  } else {
    const ini = `${p?.firstName?.[0] || ''}${p?.lastName?.[0] || ''}`.toUpperCase();
    el.textContent = ini || '?';
  }
}

// ── Renderizar vista ──────────────────────────────────────────────────────────
function renderVista(p) {
  const ini = `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`.toUpperCase();

  const coberturaSec = p.cobertura_medica
    ? `<div class="dato-seccion-label">Cobertura médica</div>
       <div class="dato-row"><span class="dato-label">Nombre</span><span class="dato-valor">${esc(p.cobertura_medica)}</span></div>
       ${p.numero_afiliado ? `<div class="dato-row"><span class="dato-label">N° Afiliado</span><span class="dato-valor">${esc(p.numero_afiliado)}</span></div>` : ''}`
    : `<div class="dato-seccion-label">Cobertura médica</div>
       <div class="dato-row"><span class="dato-label">Cobertura</span><span class="dato-valor sin-datos">Sin cobertura registrada</span></div>`;

  document.getElementById('perfil-view').innerHTML = `
    <div class="perfil-avatar-area">
      <div class="avatar">${p.foto ? `<img src="${p.foto}" alt="Foto">` : (ini || '?')}</div>
      <div class="perfil-nombre-wrap">
        <div class="perfil-nombre-row">
          <div class="perfil-nombre-big">${esc(p.firstName)} ${esc(p.lastName)}</div>
          <button class="btn-editar" id="btn-editar-perfil">Editar</button>
        </div>
        <div class="perfil-email-small">${esc(p.email)}</div>
      </div>
    </div>
    <div class="dato-row"><span class="dato-label">Teléfono</span><span class="dato-valor">${esc(p.phone) || '—'}</span></div>
    <div class="dato-row"><span class="dato-label">DNI</span><span class="dato-valor">${esc(p.dni) || '—'}</span></div>
    <div class="dato-row"><span class="dato-label">Nacimiento</span><span class="dato-valor">${formatFecha(p.fecha_nacimiento)}</span></div>
    ${coberturaSec}
  `;
}

// ── Editar / Cancelar ─────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  if (e.target.id !== 'btn-editar-perfil') return;
  if (!perfilActual) return;

  document.getElementById('dni-input').value        = perfilActual.dni || '';
  document.getElementById('nacimiento-input').value = perfilActual.fecha_nacimiento || '';
  document.getElementById('telefono-input').value   = perfilActual.phone || '';
  document.getElementById('cobertura-input').value  = perfilActual.cobertura_medica || '';
  document.getElementById('afiliado-input').value   = perfilActual.numero_afiliado || '';

  nuevaFoto = undefined;
  renderAvatar(document.getElementById('avatar-edit'), perfilActual);

  document.getElementById('perfil-view').classList.add('hidden');
  document.getElementById('perfil-edit').classList.remove('hidden');
  document.getElementById('btn-editar-perfil').classList.add('hidden');
});

document.getElementById('btn-cancelar-perfil').addEventListener('click', () => {
  document.getElementById('perfil-edit').classList.add('hidden');
  document.getElementById('perfil-view').classList.remove('hidden');
  document.getElementById('btn-editar-perfil').classList.remove('hidden');
  nuevaFoto = undefined;
});

// ── Subir foto ────────────────────────────────────────────────────────────────
document.getElementById('foto-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 1_048_576) {
    toast('La imagen es demasiado grande. Máximo 1MB.', 'error');
    e.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    nuevaFoto = ev.target.result;
    const el = document.getElementById('avatar-edit');
    el.innerHTML = `<img src="${nuevaFoto}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
});

// ── Guardar perfil ────────────────────────────────────────────────────────────
document.getElementById('form-perfil').addEventListener('submit', async (e) => {
  e.preventDefault();

  const foto             = nuevaFoto !== undefined ? nuevaFoto : perfilActual.foto;
  const dni              = document.getElementById('dni-input').value.trim();
  const fecha_nacimiento = document.getElementById('nacimiento-input').value;
  const phone            = document.getElementById('telefono-input').value.trim();
  const cobertura_medica = document.getElementById('cobertura-input').value.trim();
  const numero_afiliado  = document.getElementById('afiliado-input').value.trim();

  const btn = e.target.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    const res = await fetch(`${API_BASE_URL}/perfil/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ foto, dni, fecha_nacimiento, phone, cobertura_medica, numero_afiliado })
    });

    const data = await res.json();

    if (!res.ok) {
      toast(data.message || 'Error al guardar', 'error');
      return;
    }

    perfilActual = { ...perfilActual, foto, dni, fecha_nacimiento, phone, cobertura_medica, numero_afiliado };
    nuevaFoto = undefined;

    renderVista(perfilActual);
    document.getElementById('perfil-edit').classList.add('hidden');
    document.getElementById('perfil-view').classList.remove('hidden');
    document.getElementById('btn-editar-perfil').classList.remove('hidden');
    toast('Perfil actualizado correctamente');

  } catch {
    toast('Error conectando con el servidor', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  }
});

// ── Cargar perfil ─────────────────────────────────────────────────────────────
async function cargarPerfil() {
  try {
    const res = await fetch(`${API_BASE_URL}/perfil/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error();
    perfilActual = await res.json();
    renderVista(perfilActual);

  } catch {
    document.getElementById('perfil-view').innerHTML =
      '<p style="color:#DC2626;font-size:.85rem">Error cargando datos</p>';
    toast('Error cargando el perfil', 'error');
  }
}

cargarPerfil();

// ── QR médico ─────────────────────────────────────────────────────────────────
const btnQR       = document.getElementById('btn-generar-qr');
const qrWrapper   = document.getElementById('qr-wrapper');
const qrImg       = document.getElementById('qr-img');
const qrCountdown = document.getElementById('qr-countdown');
let qrInterval    = null;

function actualizarCountdown(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) {
    qrCountdown.textContent = 'QR expirado';
    clearInterval(qrInterval);
    return;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  qrCountdown.textContent = `Expira en ${h}h ${String(m).padStart(2, '0')}m`;
}

btnQR.addEventListener('click', async () => {
  btnQR.disabled = true;
  btnQR.textContent = 'Generando...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/qr/generar`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `HTTP ${res.status}`);
    }
    const { qr_image, expires_at } = await res.json();

    qrImg.src = qr_image;
    qrWrapper.classList.add('visible');

    if (qrInterval) clearInterval(qrInterval);
    actualizarCountdown(expires_at);
    qrInterval = setInterval(() => actualizarCountdown(expires_at), 30000);

  } catch (err) {
    console.error('QR error:', err);
    toast(err.message || 'Error generando el QR', 'error');
  } finally {
    btnQR.disabled = false;
    btnQR.textContent = 'Generar nuevo QR';
  }
});
