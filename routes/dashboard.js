const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Configura la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_LOCAL,
});

// Ruta para obtener datos del dashboard
router.get('/', async (req, res) => {
  try {
    const usuariosQuery = 'SELECT COUNT(*) FROM users';
    const proyectosQuery = 'SELECT COUNT(*) FROM proyectos WHERE activo = true';
    const alertasQuery = 'SELECT COUNT(*) FROM alertas WHERE pendiente = true';

    const resultUsuarios = await pool.query(usuariosQuery);
    const resultProyectos = await pool.query(proyectosQuery);
    const resultAlertas = await pool.query(alertasQuery);

    res.json({
      usuariosRegistrados: parseInt(resultUsuarios.rows[0].count),
      proyectosActivos: parseInt(resultProyectos.rows[0].count),
      alertasSistema: parseInt(resultAlertas.rows[0].count),
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
