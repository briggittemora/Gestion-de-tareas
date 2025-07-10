const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// CORS para desarrollo y producción
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'https://gestion-de-tareas-n7kw.onrender.com',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
}));

// Rutas
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');
const dashboardMaestroRoutes = require('./routes/dashboardMaestro');
const tareasRoutes = require('./routes/tareas');
const asignacionesRouter = require('./routes/asignaciones');
const configuracionRoutes = require('./routes/configuracionController'); // ✅ Solo esta

app.use('/api/asignaciones', asignacionesRouter);
app.use('/api/tareas', tareasRoutes); 
app.use('/api/dashboard/maestro', dashboardMaestroRoutes);
app.use('/api/configuracion', configuracionRoutes); // ✅ Aquí se usa
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Servir frontend en producción
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🟢 Servidor ejecutándose en http://localhost:${PORT}`);
});
