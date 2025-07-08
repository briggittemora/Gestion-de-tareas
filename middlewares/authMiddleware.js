const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'claveSuperSecreta123';

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No autorizado, token faltante' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No autorizado, token faltante' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

function verificarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ message: 'Acceso denegado: rol no autorizado' });
    }
    next();
  };
}

module.exports = { verificarToken, verificarRol };
