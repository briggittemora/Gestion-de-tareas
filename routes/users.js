const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'claveSuperSecreta123';

// ✅ CORREGIDO: conexión según entorno
const pool = new Pool({
  connectionString:
    process.env.NODE_ENV === 'production'
      ? process.env.DATABASE_URL
      : process.env.DATABASE_URL_LOCAL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } // Para evitar error con certificado autofirmado de Render
    : false,
});

// 🔐 Middleware para verificar token y extraer info del usuario
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ success: false, mensaje: 'Token requerido' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, mensaje: 'Token inválido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, mensaje: 'Token inválido o expirado' });
  }
}

// ✅ GET /api/users?rol=miembro&search=ana
router.get('/', authMiddleware, async (req, res) => {
  try {
    const rolesPermitidos = ['admin', 'maestro'];
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ success: false, mensaje: 'No autorizado' });
    }

    const { search, rol } = req.query;

    let query = 'SELECT id, nombre, apellido, email, rol FROM users';
    let conditions = [];
    let values = [];

    if (rol && rol !== 'Todos') {
      values.push(rol);
      conditions.push(`rol = $${values.length}`);
    }

    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      values.push(searchTerm);
      const idx = values.length;
      conditions.push(`(LOWER(nombre) LIKE $${idx} OR LOWER(apellido) LIKE $${idx} OR LOWER(email) LIKE $${idx})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY nombre ASC';

    const { rows } = await pool.query(query, values);

    const usuarios = rows.map(u => ({
      ...u,
      avatar: `https://i.pravatar.cc/100?u=${u.email}`
    }));

    res.json({ success: true, usuarios });
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({ success: false, mensaje: '❌ Error en el servidor' });
  }
});

// ✅ DELETE /api/users/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  // Verificar que el usuario sea admin
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ success: false, mensaje: 'Solo los administradores pueden eliminar usuarios' });
  }

  try {
    // Verificar si tiene asignaciones en tareas_usuarios que no estén completadas
    const asignacionesPendientes = await pool.query(
      `SELECT tu.id, t.titulo, t.asignacion_general
       FROM tareas_usuarios tu
       JOIN tareas t ON tu.tarea_id = t.id
       WHERE tu.usuario_id = $1 
         AND tu.completado = false`,
      [id]
    );

    // Si tiene asignaciones pendientes, no permitir eliminación
    if (asignacionesPendientes.rows.length > 0) {
      const tareasPendientes = asignacionesPendientes.rows.map(t => t.titulo);
      const tareasInfo = tareasPendientes.join(', ');
      return res.status(400).json({ 
        success: false, 
        mensaje: `No se puede eliminar el usuario porque tiene ${asignacionesPendientes.rows.length} tarea(s) pendiente(s): ${tareasInfo}. Complete las tareas antes de eliminar el usuario.` 
      });
    }

    // Si no tiene tareas pendientes, proceder con la eliminación
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
    }

    res.json({ success: true, mensaje: '✅ Usuario eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar usuario:', error);
    res.status(500).json({ success: false, mensaje: '❌ Error del servidor' });
  }
});

module.exports = router;
