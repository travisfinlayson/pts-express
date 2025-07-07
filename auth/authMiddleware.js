const jwt = require('jsonwebtoken');
require('dotenv').config();

function clearAuthCookie(res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
}

function authenticateToken(req, res, next) {
  const token = req.cookies.auth_token;     // name: auth_token

  if (!token) {
    clearAuthCookie(res);                   // ⬅️ wipe it
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {                              // invalid / expired
      clearAuthCookie(res);                 // ⬅️ wipe it
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
