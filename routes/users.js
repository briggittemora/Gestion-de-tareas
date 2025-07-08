// routes/users.js
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_LOCAL
});

const JWT_SECRET = process.env.JWT_SECRET || 'claveSuperSecreta123';

// Middleware para verificar token y extraer info del usuario
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

// GET /api/users?rol=miembro&search=ana
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

    // Si se especifica un rol y no es "Todos", se filtra
    if (rol && rol !== 'Todos') {
      values.push(rol);
      conditions.push(`rol = $${values.length}`);
    }

    // Si se incluye término de búsqueda
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      values.push(searchTerm);
      const idx = values.length;
      conditions.push(`(LOWER(nombre) LIKE $${idx} OR LOWER(apellido) LIKE $${idx} OR LOWER(email) LIKE $${idx})`);
    }

    // Si hay condiciones, se agregan al query
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
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, mensaje: 'Error en el servidor' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, mensaje: 'Usuario no encontrado' });
    }

    res.json({ success: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ success: false, mensaje: 'Error del servidor' });
  }
});
module.exports = router;