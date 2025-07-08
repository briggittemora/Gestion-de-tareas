// routes/configuracion.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_LOCAL
});

// Obtener configuración
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM configuracion LIMIT 1');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Actualizar configuración
router.put('/', async (req, res) => {
  const { notificaciones, modo_mantenimiento, permitir_registros } = req.body;

  try {
    await pool.query(
      'UPDATE configuracion SET notificaciones = $1, modo_mantenimiento = $2, permitir_registros = $3 WHERE id = 1',
      [notificaciones, modo_mantenimiento, permitir_registros]
    );
    res.json({ success: true, mensaje: 'Configuración actualizada' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

module.exports = router;
