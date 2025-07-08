// backend/config/db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Determinar si estamos en producción
const isProduction = process.env.NODE_ENV === 'production';

// Seleccionar la URL de la base de datos según el entorno
const dbUrl = isProduction
  ? process.env.DATABASE_URL
  : process.env.DATABASE_URL_LOCAL;

// Mostrar en consola (sin credenciales sensibles)
console.log(`🔌 Conectando a la base de datos (${isProduction ? 'producción' : 'desarrollo'})`);

// Crear la conexión
const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: isProduction
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  logging: false, // Desactiva logs de SQL en consola (puedes poner true si lo necesitas)
});

module.exports = sequelize;
