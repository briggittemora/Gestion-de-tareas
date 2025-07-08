const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'claveSuperSecreta123';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_LOCAL
});

function validarEmail(email) {
  const regex = /^\S+@\S+\.\S+$/;
  return regex.test(email);
}

function validarPassword(password) {
  return password.length >= 6;
}

// 🟢 REGISTRO
router.post('/register', async (req, res) => {
  const { nombre, apellido, cedula, correo, contrasena, rol } = req.body;

  if (!nombre || !apellido || !cedula || !correo || !contrasena) {
    return res.status(400).json({ success: false, mensaje: '⚠️ Todos los campos son obligatorios.' });
  }

  if (!validarEmail(correo)) {
    return res.status(400).json({ success: false, mensaje: '⚠️ Correo electrónico no válido.' });
  }

  if (!validarPassword(contrasena)) {
    return res.status(400).json({ success: false, mensaje: '⚠️ La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const { rows: usuarios } = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR cedula = $2',
      [correo, cedula]
    );

    if (usuarios.length > 0) {
      return res.status(400).json({ success: false, mensaje: '⚠️ Ya existe un usuario con ese correo o cédula.' });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);
    const rolAsignado = rol || 'miembro'; // Por defecto será miembro si no se envía

    await pool.query(
      'INSERT INTO users (nombre, apellido, cedula, email, password, rol) VALUES ($1, $2, $3, $4, $5, $6)',
      [nombre, apellido, cedula, correo, hashedPassword, rolAsignado]
    );

    res.status(201).json({ success: true, mensaje: '✅ Usuario registrado correctamente.' });
  } catch (error) {
    console.error('❌ Error en el registro:', error);
    res.status(500).json({ success: false, mensaje: '❌ Error en el servidor. Inténtalo más tarde.' });
  }
});

// 🔐 LOGIN
router.post('/login', async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ success: false, mensaje: '⚠️ Correo y contraseña son obligatorios.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [correo]
    );

    const usuario = rows[0];

    if (!usuario) {
      return res.status(401).json({ success: false, mensaje: '❌ Correo no registrado.' });
    }

    const contrasenaValida = await bcrypt.compare(contrasena, usuario.password);
    if (!contrasenaValida) {
      return res.status(401).json({ success: false, mensaje: '❌ Contraseña incorrecta.' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      mensaje: '✅ Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        correo: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    console.error('❌ Error en el login:', error);
    res.status(500).json({ success: false, mensaje: '❌ Error del servidor. Intenta de nuevo más tarde.' });
  }
});

// 🟡 NUEVA RUTA GET PARA OBTENER USUARIOS
router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nombre, apellido, email, rol FROM users ORDER BY nombre'
    );
    res.json({ success: true, usuarios: rows });
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
    res.status(500).json({ success: false, mensaje: '❌ Error en el servidor.' });
  }
});

module.exports = router;
