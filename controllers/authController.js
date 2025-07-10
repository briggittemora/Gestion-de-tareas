// authController.js
const { Op } = require('sequelize');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const pool = require('../db/pgpool'); // Ajusta esta ruta si tu pool está en otro archivo

// Función para validar email
function validarEmail(email) {
  const regex = /^\S+@\S+\.\S+$/;
  return regex.test(email);
}

// Función para validar contraseña
function validarPassword(password) {
  return password.length >= 6;
}

exports.registerUser = async (req, res) => {
  try {
    console.log('🟡 Datos recibidos en el registro:', req.body);

    // Validar si los registros están permitidos
    const configResult = await pool.query('SELECT permitir_registros FROM configuracion_sistema LIMIT 1');
    if (configResult.rows.length > 0 && !configResult.rows[0].permitir_registros) {
      return res.status(403).json({ success: false, mensaje: '🚫 Registro deshabilitado temporalmente.' });
    }

    // Aquí adaptamos a lo que envía tu frontend
    const { nombre, apellido, cedula, correo, contrasena } = req.body;

    // Validación básica
    if (!nombre || !apellido || !cedula || !correo || !contrasena) {
      return res.status(400).json({ success: false, mensaje: '⚠️ Todos los campos son obligatorios.' });
    }

    if (!validarEmail(correo)) {
      return res.status(400).json({ success: false, mensaje: '⚠️ Correo electrónico no válido.' });
    }

    if (!validarPassword(contrasena)) {
      return res.status(400).json({ success: false, mensaje: '⚠️ La contraseña debe tener al menos 6 caracteres.' });
    }

    // Verificar si ya existe usuario con ese email o cédula
    const usuarioExistente = await User.findOne({
      where: {
        [Op.or]: [{ email: correo }, { cedula }]
      }
    });

    if (usuarioExistente) {
      return res.status(400).json({ success: false, mensaje: '⚠️ Ya existe un usuario con ese correo o cédula.' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Crear usuario con rol 'miembro' asignado por defecto
    await User.create({
      nombre,
      apellido,
      cedula,
      email: correo,
      password: hashedPassword,
      rol: 'miembro'
    });

    return res.status(201).json({ success: true, mensaje: '✅ Usuario registrado correctamente.' });

  } catch (error) {
    console.error('❌ Error en el registro:', error);
    return res.status(500).json({ success: false, mensaje: '❌ Error en el servidor. Inténtalo más tarde.' });
  }
};
