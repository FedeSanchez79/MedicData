import express from "express";
import path from "path";
import pacienteRoutes from "./routes/paciente.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos desde la raíz
app.use(express.static(path.join(process.cwd())));

// Rutas de paciente
app.use("/", pacienteRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
