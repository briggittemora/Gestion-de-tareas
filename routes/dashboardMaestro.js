// routes/dashboardMaestro.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString:
    process.env.NODE_ENV === 'production'
      ? process.env.DATABASE_URL
      : process.env.DATABASE_URL_LOCAL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// GET /api/dashboard/maestro?userId=123
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ success: false, mensaje: 'Falta el parámetro userId' });
  }
  try {
    console.log('Consulta dashboard maestro para userId:', userId);

    const resultEstudiantes = await pool.query(
      `SELECT COUNT(*) FROM users WHERE rol = 'miembro'`
    );

    const resultTareas = await pool.query(
      `SELECT COUNT(*) FROM tareas WHERE creador_id = $1`,
      [userId]
    );

    const resultProyectos = await pool.query(
      `SELECT COUNT(*) FROM proyectos WHERE activo = true`
    );

    res.json({
      estudiantesInscritos: parseInt(resultEstudiantes.rows[0].count, 10),
      tareasCreadas: parseInt(resultTareas.rows[0].count, 10),
      proyectosActivos: parseInt(resultProyectos.rows[0].count, 10)
    });
  } catch (error) {
    console.error('🔴 ERROR EN DASHBOARD MAESTRO:', error);
    res.status(500).json({ success: false, mensaje: 'Error del servidor' });
  }
});

module.exports = router;
