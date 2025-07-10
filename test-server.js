const bcrypt = require('bcrypt');

const passwordPlain = 'AdminPass'; // Contraseña a hashear
const saltRounds = 10;

bcrypt.hash(passwordPlain, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generando hash:', err);
    return;
  }
  console.log('Hash generado:', hash);
});