const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configurar subida de archivos con multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'entregas');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'entrega-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_LOCAL,
});

// Asignar tarea a usuario
router.post('/', async (req, res) => {
  const { tarea_id, usuario_id } = req.body;
  if (!tarea_id || !usuario_id) {
    return res.status(400).json({ error: 'Faltan tarea_id o usuario_id' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tareas_usuarios (tarea_id, usuario_id)
       VALUES ($1, $2)
       ON CONFLICT (tarea_id, usuario_id) DO NOTHING
       RETURNING *`,
      [tarea_id, usuario_id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ message: 'Esta tarea ya está asignada a este usuario' });
    }
    res.json({ success: true, asignacion: result.rows[0] });
  } catch (error) {
    console.error('Error asignando tarea:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener tareas asignadas a un usuario
router.get('/usuario/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;
  try {
    const result = await pool.query(
      `
      -- Tareas asignadas directamente
      SELECT tu.id AS id, t.*, tu.estado, tu.progreso, tu.completado
      FROM tareas_usuarios tu
      JOIN tareas t ON tu.tarea_id = t.id
      WHERE tu.usuario_id = $1

      UNION

      -- Tareas generales no registradas aún
      SELECT 
        NULL AS id, t.*, NULL AS estado, NULL AS progreso, NULL AS completado
      FROM tareas t
      WHERE t.asignacion_general = true
        AND NOT EXISTS (
          SELECT 1 FROM tareas_usuarios tu
          WHERE tu.tarea_id = t.id AND tu.usuario_id = $1
        )
      ORDER BY fecha_limite ASC
      `,
      [usuario_id]
    );

    res.json({ success: true, tareas: result.rows });
  } catch (error) {
    console.error('Error obteniendo tareas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener detalles de una tarea asignada por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT tu.*, t.titulo, t.descripcion, t.tipo, t.enlace_video, t.fecha_limite, t.instrucciones
       FROM tareas_usuarios tu
       JOIN tareas t ON tu.tarea_id = t.id
       WHERE tu.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    res.json({ success: true, asignacion: result.rows[0] });
  } catch (error) {
    console.error('Error obteniendo la asignación:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Subir entrega de tarea (archivo)
router.post('/:id/entrega', upload.single('archivo'), async (req, res) => {
  const { id } = req.params;
  const archivo = req.file;

  if (!archivo) {
    return res.status(400).json({ success: false, message: 'No se proporcionó ningún archivo' });
  }

  try {
    const result = await pool.query(
      `UPDATE tareas_usuarios
       SET archivo_entregado = $1, completado = true, progreso = 100, estado = 'entregado'
       WHERE id = $2
       RETURNING *`,
      [archivo.filename, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    res.json({ success: true, mensaje: 'Archivo subido correctamente', asignacion: result.rows[0] });
  } catch (error) {
    console.error('Error guardando entrega:', error);
    res.status(500).json({ success: false, error: 'Error al guardar entrega' });
  }
});

// NUEVA RUTA para descargar archivo entregado
router.get('/:id/descargar', async (req, res) => {
  const { id } = req.params;

  try {
    // Buscar la asignación para obtener el nombre del archivo
    const result = await pool.query(
      `SELECT archivo_entregado FROM tareas_usuarios WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    const archivoNombre = result.rows[0].archivo_entregado;
    if (!archivoNombre) {
      return res.status(404).json({ success: false, message: 'No hay archivo entregado para esta asignación' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', 'entregas', archivoNombre);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado en el servidor' });
    }

    // Descargar el archivo con el nombre original
    res.download(filePath, archivoNombre, (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
        if (!res.headersSent) {
          res.status(500).send('Error al descargar el archivo');
        }
      }
    });
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Actualizar estado/progreso/completado
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { estado, progreso, completado } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tareas_usuarios SET estado = $1, progreso = $2, completado = $3 WHERE id = $4 RETURNING *`,
      [estado, progreso, completado, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    res.json({ success: true, asignacion: result.rows[0] });
  } catch (error) {
    console.error('Error actualizando asignación:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});
// Obtener asignación por tarea y usuario (crea si es general)
router.get('/detalle/:tarea_id/:usuario_id', async (req, res) => {
  const { tarea_id, usuario_id } = req.params;

  try {
    // Ver si ya tiene una asignación
    const existente = await pool.query(
      `SELECT tu.*, t.titulo, t.descripcion, t.tipo, t.enlace_video, t.fecha_limite, t.instrucciones
       FROM tareas_usuarios tu
       JOIN tareas t ON tu.tarea_id = t.id
       WHERE tu.tarea_id = $1 AND tu.usuario_id = $2`,
      [tarea_id, usuario_id]
    );

    if (existente.rows.length > 0) {
      return res.json({ success: true, asignacion: existente.rows[0] });
    }

    // Verificar si la tarea es general
    const tareaGeneral = await pool.query(
      `SELECT * FROM tareas WHERE id = $1 AND asignacion_general = true`,
      [tarea_id]
    );

    if (tareaGeneral.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Asignación no encontrada' });
    }

    // Crear asignación automáticamente
    const nuevaAsignacion = await pool.query(
      `INSERT INTO tareas_usuarios (tarea_id, usuario_id, estado, progreso, completado)
       VALUES ($1, $2, 'pendiente', 0, false)
       RETURNING *`,
      [tarea_id, usuario_id]
    );

    // Traer datos combinados de tarea y asignación
    const full = await pool.query(
      `SELECT tu.*, t.titulo, t.descripcion, t.tipo, t.enlace_video, t.fecha_limite, t.instrucciones
       FROM tareas_usuarios tu
       JOIN tareas t ON tu.tarea_id = t.id
       WHERE tu.id = $1`,
      [nuevaAsignacion.rows[0].id]
    );

    res.json({ success: true, asignacion: full.rows[0] });
  } catch (error) {
    console.error('Error en asignación dinámica:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// Obtener entregas (tareas_usuarios) para una tarea, con info de usuario
router.get('/tarea/:tarea_id/entregas', async (req, res) => {
  const { tarea_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT tu.id as entrega_id, tu.estado, tu.progreso, tu.completado, tu.fecha_asignacion, tu.archivo_entregado,
              u.id as usuario_id, u.nombre, u.apellido, u.email
       FROM tareas_usuarios tu
       JOIN users u ON tu.usuario_id = u.id
       WHERE tu.tarea_id = $1
       ORDER BY tu.fecha_asignacion ASC`,
      [tarea_id]
    );

    res.json({ success: true, entregas: result.rows });
  } catch (error) {
    console.error('Error al obtener entregas de tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});


module.exports = router;
