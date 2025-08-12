document.addEventListener("DOMContentLoaded", () => {
  const token = sessionStorage.getItem("token");
  const pacienteId = sessionStorage.getItem("pacienteId");
  const pacienteNombre = sessionStorage.getItem("pacienteNombre");
  const role = sessionStorage.getItem("role");

  if (!token || role !== "patient") {
    window.location.href = '../index.html'; // redirige al login en la raíz
    return;
  }

  // Mostrar nombre del paciente
  document.getElementById("nombre-paciente").textContent = `Bienvenido, ${pacienteNombre}`;

  // Limpiar contenedor QR
  const qrContainer = document.getElementById("qr-container");
  qrContainer.innerHTML = "";

  // Botón Generar QR
  document.getElementById("btn-generar-qr").addEventListener("click", () => {
    const enlace = `${window.location.origin}/historial/paciente/${pacienteId}`;
    QRCode.toCanvas(document.getElementById("qr-code"), enlace, { width: 200 }, (error) => {
      if (error) console.error(error);
    });
    qrContainer.classList.remove("hidden");
  });

  // Botón Ver Historial Médico
  document.getElementById("btn-ver-historial").addEventListener("click", () => {
    window.location.href = `/historial/paciente/${pacienteId}`;
  });

  // Botón Logout - limpiar sesión y redirigir
  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.clear(); // limpia todos los datos de sessionStorage
    window.location.href = '../index.html'; // vuelve al login en raíz
  });
});
