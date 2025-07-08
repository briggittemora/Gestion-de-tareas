// backend/config/db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const dbUrl = isProduction ? process.env.DATABASE_URL : process.env.DATABASE_URL_LOCAL;

console.log('Conectando a la base de datos:', dbUrl); // <-- Agrega este log

const sequelize = new Sequelize(
  dbUrl,
  {
    dialect: 'postgres',
    dialectOptions: isProduction
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  }
);

module.exports = sequelize;