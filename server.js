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
    'http://localhost:5000',        // si usas otro puerto de React
  'http://127.0.0.1:3000',  
  'https://systeclinx-frontend.onrender.com',
];

app.use(cors({
  origin: (origin, callback) => {
   
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://192.168.0.')) {
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
const configuracionRoutes = require('./routes/configuracion');
const dashboardMaestroRoutes = require('./routes/dashboardMaestro');
const tareasRoutes = require('./routes/tareas');
const asignacionesRouter = require('./routes/asignaciones');
// Cambié aquí para que dashboardMaestroRoutes se monte en /api/dashboard
app.use('/api/asignaciones', asignacionesRouter);
app.use('/api/tareas', tareasRoutes); 
app.use('/api/dashboard/maestro', dashboardMaestroRoutes);
app.use('/api/configuracion', configuracionRoutes);
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
