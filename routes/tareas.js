const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_LOCAL,
});

// Crear tarea
router.post('/', async (req, res) => {
  const {
    titulo,
    descripcion,
    creador_id,
    tipo,
    enlace_video,
    fecha_limite,
    instrucciones,
    asignacion_general, // nuevo campo
  } = req.body;

  if (!titulo || !creador_id || !tipo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tareas 
        (titulo, descripcion, creador_id, tipo, enlace_video, fecha_limite, instrucciones, asignacion_general) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        titulo,
        descripcion || null,
        creador_id,
        tipo,
        enlace_video || null,
        fecha_limite || null,
        instrucciones || null,
        asignacion_general ?? true, // por defecto true si no se especifica
      ]
    );

    res.status(201).json({ success: true, tarea: result.rows[0] });
  } catch (error) {
    console.error('Error creando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener tareas de un creador (maestro)
router.get('/', async (req, res) => {
  const creador_id = req.query.creador_id;
  if (!creador_id) {
    return res.status(400).json({ error: 'Falta creador_id en query' });
  }
  try {
    const result = await pool.query(
      'SELECT * FROM tareas WHERE creador_id = $1 ORDER BY fecha_limite ASC',
      [creador_id]
    );
    res.json({ success: true, tareas: result.rows });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener tareas asignadas directamente a un usuario (si no son generales)
router.get('/usuario/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) return res.status(400).json({ success: false, error: 'Falta userId' });

  try {
    const result = await pool.query(
      `SELECT id, titulo, descripcion, creador_id, tipo, enlace_video, fecha_limite, instrucciones, fecha_creacion, estado, progreso, asignado_id, completado
       FROM tareas
       WHERE asignado_id = $1
       ORDER BY fecha_limite ASC`,
      [userId]
    );

    res.json({ success: true, tareas: result.rows });
  } catch (error) {
    console.error('Error al obtener tareas usuario:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener una tarea por id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM tareas WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }
    res.json({ success: true, tarea: result.rows[0] });
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
// Eliminar tarea por id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tareas WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada para eliminar' });
    }
    res.json({ success: true, message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});
// Actualizar tarea (editar y actualizar completado/progreso y asignacion_general)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    titulo,
    descripcion,
    tipo,
    enlace_video,
    fecha_limite,
    instrucciones,
    estado,
    progreso,
    completado,
    asignacion_general,
  } = req.body;

  if (!titulo || !tipo) {
    return res.status(400).json({ success: false, error: 'Título y tipo son obligatorios' });
  }

  try {
    const result = await pool.query(
      `UPDATE tareas SET 
        titulo = COALESCE($1, titulo),
        descripcion = COALESCE($2, descripcion),
        tipo = COALESCE($3, tipo),
        enlace_video = COALESCE($4, enlace_video),
        fecha_limite = COALESCE($5, fecha_limite),
        instrucciones = COALESCE($6, instrucciones),
        estado = COALESCE($7, estado),
        progreso = COALESCE($8, progreso),
        completado = COALESCE($9, completado),
        asignacion_general = COALESCE($10, asignacion_general)
       WHERE id = $11
       RETURNING *`,
      [
        titulo,
        descripcion || null,
        tipo,
        enlace_video || null,
        fecha_limite || null,
        instrucciones || null,
        estado || null,
        progreso || null,
        completado ?? null,
        asignacion_general,
        id,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada para actualizar' });
    }

    res.json({ success: true, tarea: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

module.exports = router;
