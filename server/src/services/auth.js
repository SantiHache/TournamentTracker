const jwt = require("jsonwebtoken");
const { config } = require("../config");

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      sv: user.session_version,
      nombre: user.nombre,
      playerId: user.player_id || null,
    },
    config.jwtSecret,
    { expiresIn: "8h" }
  );
}

module.exports = { signToken };
